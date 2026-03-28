import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "frontend");
const outputDir = path.join(rootDir, "dist");

const configuredApiBase = String(process.env.OPTICORE_API_BASE || "").trim().replace(/\/+$/, "");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });

const configContents = `window.OPTICORE_CONFIG = Object.assign({}, window.OPTICORE_CONFIG, {
  API_BASE: ${JSON.stringify(configuredApiBase)}
});
`;

fs.writeFileSync(path.join(outputDir, "config.js"), configContents, "utf8");

console.log(`Built frontend into ${outputDir}`);
console.log(`OPTICORE_API_BASE=${configuredApiBase || "(same-origin fallback)"}`);
