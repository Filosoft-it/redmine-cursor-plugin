import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.PLUGIN_ROOT && path.join(process.env.PLUGIN_ROOT, "server", "dist", "index.js"),
  process.env.CLAUDE_PLUGIN_ROOT &&
    path.join(process.env.CLAUDE_PLUGIN_ROOT, "server", "dist", "index.js"),
  path.join(pluginRoot, "server", "dist", "index.js"),
].filter(Boolean);

const entry = candidates.find((candidate) => existsSync(candidate));

if (!entry) {
  console.error(
    "Redmine MCP server bundle not found. Expected server/dist/index.js inside the plugin.",
  );
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
