import app from "./app";

// Vercel serverless entry point. An Express app instance is itself a
// (req, res) request handler, so exporting it as the default export makes it
// directly usable as a Vercel Node serverless function.
export default app;
