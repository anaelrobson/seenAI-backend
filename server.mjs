import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Your OpenAI API key (keep this secure)
const OPENAI_KEY = "sk-proj-vKOP0D_ambsLhlkDqGNB0ssX4GCLcT1laj5ocZW..."; // replace with full key if truncated

// ✅ Root route for Replit preview
app.get("/", (req, res) => {
  res.send("Whisper backend is running.");
});

// ✅ Transcription endpoint
app.post("/transcribe", async (req, res) => {
  const { videoUrl } = req.body;

  try {
    const videoRes = await fetch(videoUrl);
    const videoBuffer = await videoRes.buffer();

    const formData = new FormData();
    formData.append("file", videoBuffer, {
      filename: "upload.webm",
      contentType: "video/webm"
    });
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: formData,
    });

    const result = await whisperRes.text();

    res.status(200).json({ transcription: result });
  } catch (err) {
    console.error("Transcription failed:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// ✅ Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Whisper backend running on port ${PORT}`);
});
