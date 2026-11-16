// Explicit Vercel route for AI script generation.
// Reuse the secured gateway handler and its allowlist/authentication logic.
import handler from "../[...path].js";
export default handler;
