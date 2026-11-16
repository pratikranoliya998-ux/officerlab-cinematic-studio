// Secure same-origin proxy for the OfficerLab AI gateway.
import { URL } from "node:url";

export default async function handler(req, res) {
  // Resolve the route from the actual URL first; Vercel's catch-all query
  // parameter can vary between local emulators and deployed runtimes.
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const prefix = "/api/ai/";
  let action = requestUrl.pathname.startsWith(prefix)
    ? requestUrl.pathname.slice(prefix.length)
    : "";
  if (!action && req.query?.path) {
    action = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path);
    action = action.replace(/^api\/ai\//, "").replace(/^ai\//, "");
  }
  action = action.replace(/^\/+|\/+$/g, "");
  const allowed = new Set(["providers", "providers/test", "script/generate"]);
  if (!allowed.has(action)) {
    return res.status(404).json({ detail: "Unknown AI API route", receivedPath: requestUrl.pathname, resolvedAction: action || null });
  }
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
    const headers = { Accept: "application/json", "X-OfficerLab-Access-Key": accessKey };
    if (req.method === "POST") headers["Content-Type"] = "application/json";
    const upstream = await fetch(`${base}/api/${action}`, {
      method: req.method,
      headers,
      ...(req.method === "POST" ? { body: JSON.stringify(req.body || {}) } : {}),
    });
    const raw = await upstream.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { data = { detail: raw || "Invalid response from AI gateway" }; }
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ detail: "Could not reach the OfficerLab AI gateway. Check the Render service URL and health status." });
  }
}
