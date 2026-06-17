import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const toolsPath = path.join(workspaceRoot, ".tools");
const pathKey = process.platform === "win32" ? "Path" : "PATH";
const currentPath = process.env[pathKey] ?? process.env.PATH ?? "";
const turboArgs = process.argv.slice(2);
const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "turbo";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", ["turbo", ...turboArgs.map(quoteCmdArg)].join(" ")]
    : turboArgs;

const child = spawn(command, args, {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    [pathKey]: [toolsPath, currentPath].filter(Boolean).join(path.delimiter)
  },
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function quoteCmdArg(value) {
  if (/^[a-zA-Z0-9_./:=@-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/(["^&|<>%])/g, "^$1")}"`;
}
