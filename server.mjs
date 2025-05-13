import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// ✅ Root check
app.get("/", (req, res) => {
  res.send("Whisper backend is running.");
});

// ✅ Transcription route
app.post("/transcribe", async (req, res) => {
  const { videoUrl } = req.body;
  console.log("Received video URL:", videoUrl);

  try {
    // Download the video
    const videoRes = await fetch(videoUrl);
    const videoBuffer = await videoRes.buffer();
    console.log("✅ Video downloaded. Size:", (videoBuffer.length / (1024 * 1024)).toFixed(2), "MB");

    // Dynamically get extension + MIME type
    const extension = videoUrl.split('.').pop()?.toLowerCase() || "mp4";
    const mimeType = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
    }[extension] || "video/mp4";

    const formData = new FormData();
    formData.append("file", videoBuffer, {
      filename: `upload.${extension}`,
      contentType: mimeType,
    });
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    console.log("📡 Sending request to Whisper...");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: formData,
    });

    const resultText = await whisperRes.text();
    console.log("✅ Transcription received!");

    res.status(200).json({ transcription: resultText });
  } catch (err) {
    console.error("❌ Transcription failed:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Whisper backend running on port ${PORT}`);
});
