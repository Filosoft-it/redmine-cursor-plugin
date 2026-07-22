import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    fail(`Missing ${rel}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (error) {
    fail(`Invalid JSON ${rel}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

const manifest = readJson(".cursor-plugin/plugin.json");
if (manifest) {
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(manifest.name || "")) {
    fail(`Invalid plugin name: ${manifest.name}`);
  }
  if (!manifest.variables?.properties?.REDMINE_URL) fail("variables.REDMINE_URL missing");
  if (!manifest.variables?.properties?.REDMINE_API_KEY) fail("variables.REDMINE_API_KEY missing");
  if (manifest.logo && !existsSync(path.join(root, manifest.logo))) {
    fail(`logo not found: ${manifest.logo}`);
  }
}

const mcp = readJson("mcp.json");
if (mcp?.mcpServers?.redmine) {
  const env = mcp.mcpServers.redmine.env || {};
  for (const key of ["REDMINE_URL", "REDMINE_API_KEY", "REDMINE_READ_ONLY"]) {
    if (env[key] !== `\${${key}}`) fail(`mcp.json env ${key} must be \${${key}}`);
    if (manifest?.variables && !manifest.variables.properties?.[key] && key !== "REDMINE_READ_ONLY") {
      // REDMINE_READ_ONLY is optional but present
    }
    if (manifest?.variables && !manifest.variables.properties?.[key]) {
      fail(`plugin variable missing for ${key}`);
    }
  }
  const args = mcp.mcpServers.redmine.args || [];
  if (!args.some((a) => String(a).includes("run-redmine-mcp.mjs"))) {
    fail("mcp.json should launch scripts/run-redmine-mcp.mjs");
  }
}

for (const rel of [
  "README.md",
  "LICENSE",
  "assets/logo.svg",
  "scripts/run-redmine-mcp.mjs",
  "server/dist/index.js",
  "rules/redmine-usage.mdc",
  "agents/redmine-assistant.md",
]) {
  if (!existsSync(path.join(root, rel))) fail(`Missing ${rel}`);
}

const skills = walk(path.join(root, "skills"), (f) => f.endsWith("SKILL.md"));
if (skills.length < 1) fail("No skills found");
for (const skill of skills) {
  const text = readFileSync(skill, "utf8");
  if (!text.startsWith("---") || !/name:\s*.+/.test(text) || !/description:\s*.+/.test(text)) {
    fail(`Skill missing frontmatter: ${path.relative(root, skill)}`);
  }
}

const commands = walk(path.join(root, "commands"), (f) => /\.(md|txt|mdc|markdown)$/.test(f));
for (const command of commands) {
  const text = readFileSync(command, "utf8");
  if (!text.startsWith("---") || !/name:\s*.+/.test(text) || !/description:\s*.+/.test(text)) {
    fail(`Command missing frontmatter: ${path.relative(root, command)}`);
  }
}

const agents = walk(path.join(root, "agents"), (f) => /\.(md|mdc|markdown)$/.test(f));
for (const agent of agents) {
  const text = readFileSync(agent, "utf8");
  if (!text.startsWith("---") || !/name:\s*.+/.test(text) || !/description:\s*.+/.test(text)) {
    fail(`Agent missing frontmatter: ${path.relative(root, agent)}`);
  }
}

if (errors.length) {
  console.error("Plugin validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("Plugin validation passed.");
