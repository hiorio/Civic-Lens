import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const envFile = path.join(workspaceRoot, ".env");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node .tools/with-env.mjs <command> [...args]");
  process.exit(1);
}

const env = {
  ...process.env,
  ...readEnvFile(envFile)
};
const result = spawnSync(args[0], args.slice(1), {
  env,
  shell: true,
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");

        if (separatorIndex === -1) {
          return [line, ""];
        }

        return [
          line.slice(0, separatorIndex),
          line.slice(separatorIndex + 1).replace(/^["']|["']$/g, "")
        ];
      })
  );
}
