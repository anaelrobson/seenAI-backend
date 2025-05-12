import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

// Load environment variables from Replit secrets or a local .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// ✅ Root route (for sanity check)
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
      contentType: "video/webm",
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Whisper backend running on port ${PORT}`);
});
