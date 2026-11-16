// Secure same-origin proxy for the OfficerLab AI gateway.
// Set RENDER_API_URL and OFFICERLAB_API_ACCESS_KEY in Vercel server-side Environment Variables.
export default async function handler(req, res) {
  const action = Array.isArray(req.query?.path) ? req.query.path.join("/") : String(req.query?.path || "");
  const allowed = new Set(["providers", "providers/test", "script/generate"]);
  if (!allowed.has(action)) return res.status(404).json({ detail: "Unknown AI API route" });
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ detail: "Method not allowed" });
  }
  const base = (process.env.RENDER_API_URL || "").replace(/\/+$/, "");
  const accessKey = process.env.OFFICERLAB_API_ACCESS_KEY || "";
  if (!base || !accessKey) {
    return res.status(503).json({ detail: "AI gateway is not configured. Add RENDER_API_URL and OFFICERLAB_API_ACCESS_KEY to Vercel server-side Environment Variables." });
  }
  try {
    const headers = { "Accept": "application/json", "X-OfficerLab-Access-Key": accessKey };
    if (req.method === "POST") headers["Content-Type"] = "application/json";
    const upstream = await fetch(`${base}/api/${action}`, {
      method: req.method,
      headers,
      ...(req.method === "POST" ? { body: JSON.stringify(req.body || {}) } : {}),
    });
    const raw = await upstream.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw || "Invalid response from AI gateway" }; }
    return res.status(upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({ detail: "Could not reach the OfficerLab AI gateway. Check the Render service URL and health status." });
  }
}
