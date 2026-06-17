import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const envFile = readEnvFile(path.join(workspaceRoot, ".env"));
const nodeBin = process.execPath;
const tmpDir = process.env.TEMP ?? process.env.TMP ?? workspaceRoot;
const nodePath = path.dirname(nodeBin);
const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
const baseEnv = {
  APPDATA: process.env.APPDATA ?? "",
  ComSpec: process.env.ComSpec ?? `${systemRoot}\\System32\\cmd.exe`,
  LOCALAPPDATA: process.env.LOCALAPPDATA ?? "",
  Path: [nodePath, `${systemRoot}\\System32`, systemRoot].join(path.delimiter),
  SystemRoot: systemRoot,
  TEMP: tmpDir,
  TMP: tmpDir,
  USERPROFILE: process.env.USERPROFILE ?? ""
};

const nextBin = findNextBin();
const api = startProcess({
  args: ["dist/main.js"],
  cwd: path.join(workspaceRoot, "apps", "api"),
    env: {
      ...envFile,
      API_PREFIX: "v1",
      PORT: "4000",
      WEB_ORIGIN: "http://localhost:3000,http://127.0.0.1:3000"
    },
  name: "api"
});
const web = startProcess({
  args: [nextBin, "dev", "-H", "0.0.0.0", "-p", "3000"],
  cwd: path.join(workspaceRoot, "apps", "web"),
    env: {
      ...envFile,
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4000/v1"
    },
  name: "web"
});

console.log(
  JSON.stringify(
    {
      api,
      web
    },
    null,
    2
  )
);

function startProcess({ args, cwd, env, name }) {
  const outPath = path.join(tmpDir, `civic-lens-${name}.out.log`);
  const errPath = path.join(tmpDir, `civic-lens-${name}.err.log`);
  const out = fs.openSync(outPath, "a");
  const err = fs.openSync(errPath, "a");
  const child = spawn(nodeBin, args, {
    cwd,
    detached: true,
    env: {
      ...baseEnv,
      ...env
    },
    stdio: ["ignore", out, err],
    windowsHide: true
  });

  child.unref();

  return {
    errPath,
    outPath,
    pid: child.pid
  };
}

function findNextBin() {
  const pnpmDir = path.join(workspaceRoot, "node_modules", ".pnpm");
  const nextPackageDir = fs
    .readdirSync(pnpmDir, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.startsWith("next@"));

  if (!nextPackageDir) {
    throw new Error("Next.js package was not found in node_modules/.pnpm.");
  }

  return path.join(
    pnpmDir,
    nextPackageDir.name,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );
}

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
