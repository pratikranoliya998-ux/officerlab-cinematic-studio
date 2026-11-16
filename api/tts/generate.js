// Secure same-origin HeyGen TTS proxy. The HeyGen key is never sent to the browser.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ detail: "Method not allowed" });
  }
  const base = (process.env.RENDER_API_URL || "").replace(/\/+$/, "");
  const accessKey = process.env.OFFICERLAB_API_ACCESS_KEY || "";
  if (!base || !accessKey) {
    return res.status(503).json({ detail: "AI gateway is not configured. Check Vercel server-side environment variables." });
  }
  try {
    const upstream = await fetch(`${base}/api/tts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OfficerLab-Access-Key": accessKey,
        "Accept": "audio/*, application/json"
      },
      body: JSON.stringify(req.body || {})
    });
    const contentType = upstream.headers.get("content-type") || "application/json";
    if (!upstream.ok || contentType.includes("application/json")) {
      const raw = await upstream.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw || "TTS request failed" }; }
      return res.status(upstream.status).json(data);
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="officerlab-heygen-voice.wav"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audio);
  } catch {
    return res.status(502).json({ detail: "Could not reach the OfficerLab TTS gateway. Check the Render service." });
  }
}
