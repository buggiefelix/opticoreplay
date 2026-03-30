import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const buildScript = path.join(rootDir, "scripts", "build-frontend.mjs");
const configuredApiBase = String(
  process.env.OPTICORE_MOBILE_API_BASE || process.env.OPTICORE_API_BASE || ""
).trim();

if (!configuredApiBase) {
  console.error(
    [
      "OPTICORE_MOBILE_API_BASE is required for mobile builds.",
      "Set it to your deployed backend URL, for example:",
      "OPTICORE_MOBILE_API_BASE=https://your-render-backend.onrender.com npm run mobile:sync"
    ].join("\n")
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [buildScript], {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    OPTICORE_API_BASE: configuredApiBase
  }
});

process.exit(result.status ?? 1);
