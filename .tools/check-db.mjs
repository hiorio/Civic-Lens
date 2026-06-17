import net from "node:net";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(workspaceRoot, ".env");
const env = readEnv(envPath);
const databaseUrl = env.DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  fail("DATABASE_URL is not set. Add it to .env or the shell environment.");
}

const parsed = new URL(stripQuotes(databaseUrl));
const host = parsed.hostname || "localhost";
const port = Number(parsed.port || 5432);
const database = parsed.pathname.replace(/^\//, "");

checkTcp(host, port, 3000)
  .then(() => {
    console.log(
      JSON.stringify(
        {
          status: "ok",
          host,
          port,
          database,
          message: "PostgreSQL port is reachable."
        },
        null,
        2
      )
    );
  })
  .catch((error) => {
    const dockerStatus = getDockerStatus();

    fail(
      [
        `PostgreSQL is not reachable at ${host}:${port}.`,
        "Start the local database before running the API.",
        "Expected command: docker compose -f infra/docker-compose.yml up -d postgres",
        `Docker CLI: ${dockerStatus}`,
        `Underlying error: ${formatError(error)}`
      ].join("\n")
    );
  });

function readEnv(filePath) {
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
          stripQuotes(line.slice(separatorIndex + 1))
        ];
      })
  );
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function checkTcp(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("connection timed out"));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function getDockerStatus() {
  const result = spawnSync("docker", ["--version"], {
    encoding: "utf8",
    shell: false
  });

  if (result.error) {
    return "not found in PATH";
  }

  if (result.status !== 0) {
    return result.stderr.trim() || "available but returned a non-zero status";
  }

  return result.stdout.trim();
}

function formatError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return String(error);
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}
