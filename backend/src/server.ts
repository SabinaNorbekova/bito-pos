import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] listening on :${env.port} (env=${env.nodeEnv})`);
    console.log(
      `[server] swagger docs at http://localhost:${env.port}/api-docs`
    );
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error", err);
  process.exit(1);
});
