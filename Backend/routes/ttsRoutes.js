import express from "express";

const router = express.Router();
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

router.post("/speech", async (req, res) => {
  const { text, voiceId = process.env.ELEVENLABS_VOICE_ID } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: "Text must be 5000 characters or fewer" });
  }

  if (!process.env.ELEVENLABS_API_KEY || !voiceId) {
    return res.status(503).json({
      error: "ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to Backend/.env"
    });
  }

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("ElevenLabs request failed:", response.status, details);
      return res.status(502).json({
        error: `ElevenLabs request failed (${response.status}). Check the API key, voice ID, and backend network connection.`
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audio.length,
      "Cache-Control": "no-store"
    });
    return res.send(audio);
  } catch (error) {
    console.error("ElevenLabs speech error:", error.message);
    return res.status(502).json({ error: "Text-to-speech service unavailable" });
  }
});

export default router;
