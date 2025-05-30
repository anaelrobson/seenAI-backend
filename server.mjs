import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
dotenv.config();

const app = express();
app.use(
  cors({
    origin: ["https://seen-ai.com", "https://seenai.framer.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// ✅ Root check
app.get("/", (req, res) => {
  res.send("Whisper + Tone backend is running.");
});

// ✅ Transcription + Tone route
app.post("/analyze", async (req, res) => {
  const { videoUrl } = req.body;
  console.log("Received video URL:", videoUrl);

  const id = uuidv4();
  const tempVideoPath = path.join("./", `temp_video_${id}.mp4`);
  const tempAudioPath = path.join("./", `upload_${id}.wav`);

  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    const videoBuffer = await videoRes.buffer();
    fs.writeFileSync(tempVideoPath, videoBuffer);
    console.log("✅ Video saved locally:", tempVideoPath);

    // Convert video to audio using ffmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ["-i", tempVideoPath, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", tempAudioPath]);
      ffmpeg.on("close", resolve);
      ffmpeg.on("error", reject);
    });
    console.log("🔊 Audio extracted:", tempAudioPath);

    // Transcribe audio with Whisper
    const audioBuffer = fs.readFileSync(tempAudioPath);
    const formData = new FormData();
    formData.append("file", audioBuffer, {
      filename: `upload.wav`,
      contentType: "audio/wav",
    });
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: formData,
    });

    const resultText = await whisperRes.text();
    console.log("📝 Transcription done:", resultText.substring(0, 100));

    // 🔍 Run Python tone analysis
    const toneData = await new Promise((resolve, reject) => {
      const py = spawn("python3", ["analyze_tone.py", tempAudioPath]);
      let data = "";
      py.stdout.on("data", chunk => (data += chunk));
      py.stderr.on("data", err => console.error("Python error:", err.toString()));
      py.on("close", () => resolve(JSON.parse(data)));
      py.on("error", reject);
    });

    console.log("🎯 Tone data:", toneData);

    // 🧠 Send to GPT for feedback
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You're a speech and tone expert. Analyze how the user sounds and give constructive feedback on delivery, emotion, and confidence.",
          },
          {
            role: "user",
            content: `Here are the extracted audio features: ${JSON.stringify(toneData, null, 2)}\nGive an honest and helpful analysis of their tone.`,
          },
        ],
      }),
    });

    const gptJson = await gptRes.json();
    const feedback = gptJson.choices?.[0]?.message?.content || "No feedback returned.";

    res.status(200).json({ transcription: resultText, tone: toneData, feedback });
  } catch (err) {
    console.error("❌ Full analysis failed:", err);
    res.status(500).json({ error: "Analysis failed" });
  } finally {
    // Cleanup
    if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
    if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Whisper + Tone backend running on port ${PORT}`);
});
