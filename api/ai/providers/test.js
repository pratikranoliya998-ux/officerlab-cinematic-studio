// Explicit Vercel route for provider connection tests.
// Reuse the secured gateway handler and its allowlist/authentication logic.
import handler from "../[...path].js";
export default handler;
