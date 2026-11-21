import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const origin = "http://127.0.0.1:3220";
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(3220, "127.0.0.1", () => probe.close(resolve));
});
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3220"], { stdio: "inherit" });
const serverExit = once(server, "exit");
let activeTest;
function stop() {
  activeTest?.kill();
  server.kill();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

try {
  let ready = false;
  for (let attempt = 0; attempt < 60 && server.exitCode === null; attempt++) {
    await delay(250);
    try {
      if ((await fetch(origin, { signal: AbortSignal.timeout(500) })).ok) {
        ready = true;
        break;
      }
    } catch { /* The listening socket may not be open yet. */ }
  }
  if (!ready || server.exitCode !== null) throw new Error("Native checks require a production server on port 3220.");
  for (const file of ["e2e/native-navigation.ts", "e2e/native-saved-setups.ts"]) {
    activeTest = spawn("bun", [file], { stdio: "inherit", env: { ...process.env, KILO_MODELS_NATIVE_URL: origin } });
    const [code] = await once(activeTest, "exit");
    activeTest = undefined;
    if (code !== 0) throw new Error(`Native check failed: ${file}`);
  }
  console.log("Native WebMCP checks passed");
} finally {
  stop();
  await serverExit;
}
