import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type FakeGatewayArchiveOptions = {
  artifactVersion: string;
  mode: "healthy" | "failing" | "stale_then_healthy";
};

export const createFakeGatewayArchive = async (
  outputDir: string,
  options: FakeGatewayArchiveOptions,
): Promise<string> => {
  const runtimeDir = await fsp.mkdtemp(
    path.join(outputDir, `fake-managed-gateway-${options.artifactVersion}-`),
  );
  const distDir = path.join(runtimeDir, "dist");
  await fsp.mkdir(distDir, { recursive: true });

  const packageJson = {
    name: "autobyteus-message-gateway",
    version: options.artifactVersion,
    main: "dist/index.js",
  };
  await fsp.writeFile(
    path.join(runtimeDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );

  const indexContents =
    options.mode === "healthy"
      ? buildHealthyGatewayRuntimeSource()
      : options.mode === "stale_then_healthy"
        ? buildStaleThenHealthyGatewayRuntimeSource()
      : 'process.exit(1);\n';
  await fsp.writeFile(path.join(distDir, "index.js"), indexContents, "utf8");

  const archiveBaseName = `autobyteus-message-gateway-${options.artifactVersion}-node-generic.tar.gz`;
  const archivePath = path.join(outputDir, archiveBaseName);
  await runCommand("tar", ["-czf", archivePath, "-C", runtimeDir, "."]);

  const sha256 = await computeSha256(archivePath);
  await fsp.writeFile(
    `${archivePath}.sha256`,
    `${sha256}  ${archiveBaseName}\n`,
    "utf8",
  );
  await fsp.writeFile(
    `${archivePath}.json`,
    `${JSON.stringify(
      {
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        artifactVersion: packageJson.version,
        platformKey: "node-generic",
        archiveType: "tar.gz",
        archiveFileName: archiveBaseName,
        sha256,
        entrypoint: "dist/index.js",
        packageRoot: ".",
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return archivePath;
};

export const writeManifest = async (
  targetPath: string,
  input: {
    serverVersion: string;
    releaseTag: string;
    artifactVersion: string;
    baseUrl: string;
  },
): Promise<void> => {
  const archiveBaseName = `autobyteus-message-gateway-${input.artifactVersion}-node-generic.tar.gz`;
  await fsp.writeFile(
    targetPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        releases: [
          {
            serverVersion: input.serverVersion,
            releaseTag: input.releaseTag,
            artifactVersion: input.artifactVersion,
            platformKey: "node-generic",
            archiveType: "tar.gz",
            downloadUrl: `${input.baseUrl}/${archiveBaseName}`,
            sha256Url: `${input.baseUrl}/${archiveBaseName}.sha256`,
            metadataUrl: `${input.baseUrl}/${archiveBaseName}.json`,
            supportedProviders: ["WHATSAPP", "WECOM", "DISCORD", "TELEGRAM"],
            excludedProviders: ["WECHAT"],
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
};

const buildHealthyGatewayRuntimeSource = (): string => `
const http = require("node:http");

const host = process.env.GATEWAY_HOST ?? "127.0.0.1";
const port = Number(process.env.GATEWAY_PORT ?? 0);
const adminToken = process.env.GATEWAY_ADMIN_TOKEN ?? "";
const wecomAccounts = JSON.parse(process.env.GATEWAY_WECOM_APP_ACCOUNTS_JSON ?? "[]");
const discordAccountId = process.env.GATEWAY_DISCORD_ACCOUNT_ID ?? null;
const telegramAccountId = process.env.GATEWAY_TELEGRAM_ACCOUNT_ID ?? null;

const unauthorized = (response) => {
  response.statusCode = 401;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ detail: "Missing or invalid admin token." }));
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/health") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      service: "autobyteus-message-gateway",
      status: "ok",
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  const authHeader = request.headers.authorization ?? "";
  if (authHeader !== \`Bearer \${adminToken}\`) {
    unauthorized(response);
    return;
  }

  if (url.pathname === "/api/runtime-reliability/v1/status") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      runtime: {
        state: "HEALTHY",
        criticalCode: null,
        updatedAt: new Date().toISOString(),
        workers: {
          inboundForwarder: { running: true, lastError: null, lastErrorAt: null },
          outboundSender: { running: true, lastError: null, lastErrorAt: null }
        },
        locks: {
          inbox: { ownerId: "fake-lock", held: true, lost: false, lastHeartbeatAt: new Date().toISOString(), lastError: null },
          outbox: { ownerId: "fake-lock", held: true, lost: false, lastHeartbeatAt: new Date().toISOString(), lastError: null }
        }
      },
      queue: {
        inboundDeadLetterCount: 0,
        inboundCompletedUnboundCount: 0,
        outboundDeadLetterCount: 0
      }
    }));
    return;
  }

  if (url.pathname === "/api/runtime-reliability/v1/shutdown" && request.method === "POST") {
    response.statusCode = 202;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ accepted: true }));
    setTimeout(() => server.close(() => process.exit(0)), 0);
    return;
  }

  if (url.pathname === "/api/channel-admin/v1/wecom/accounts") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ items: wecomAccounts }));
    return;
  }

  if (url.pathname === "/api/channel-admin/v1/discord/peer-candidates") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      accountId: discordAccountId,
      updatedAt: new Date().toISOString(),
      items: [
        {
          peerId: "discord-peer-1",
          peerType: "USER",
          threadId: null,
          displayName: "Discord Peer 1",
          lastMessageAt: new Date().toISOString()
        }
      ]
    }));
    return;
  }

  if (url.pathname === "/api/channel-admin/v1/telegram/peer-candidates") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      accountId: telegramAccountId,
      updatedAt: new Date().toISOString(),
      items: [
        {
          peerId: "telegram-peer-1",
          peerType: "USER",
          threadId: null,
          displayName: "Telegram Peer 1",
          lastMessageAt: new Date().toISOString()
        }
      ]
    }));
    return;
  }

  response.statusCode = 404;
  response.end("not found");
});

server.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

server.listen(port, host);

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
`;

const buildStaleThenHealthyGatewayRuntimeSource = (): string => `
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const host = process.env.GATEWAY_HOST ?? "127.0.0.1";
const port = Number(process.env.GATEWAY_PORT ?? 0);
const adminToken = process.env.GATEWAY_ADMIN_TOKEN ?? "";
const runtimeDataRoot = process.env.GATEWAY_RUNTIME_DATA_ROOT ?? process.cwd();
const markerPath = path.join(runtimeDataRoot, "fake-gateway-stale-once.json");

fs.mkdirSync(runtimeDataRoot, { recursive: true });
const firstBoot = !fs.existsSync(markerPath);
if (firstBoot) {
  fs.writeFileSync(
    markerPath,
    JSON.stringify({ staleServed: true, writtenAt: new Date().toISOString() }),
    "utf8",
  );
}

const staleTimestamp = "2000-01-01T00:00:00.000Z";
const currentTimestamp = () => new Date().toISOString();
const heartbeatTimestamp = () => (firstBoot ? staleTimestamp : currentTimestamp());

const unauthorized = (response) => {
  response.statusCode = 401;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ detail: "Missing or invalid admin token." }));
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/health") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      service: "autobyteus-message-gateway",
      status: "ok",
      timestamp: currentTimestamp(),
    }));
    return;
  }

  const authHeader = request.headers.authorization ?? "";
  if (authHeader !== \`Bearer \${adminToken}\`) {
    unauthorized(response);
    return;
  }

  if (url.pathname === "/api/runtime-reliability/v1/status") {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      runtime: {
        state: "HEALTHY",
        criticalCode: null,
        updatedAt: heartbeatTimestamp(),
        workers: {
          inboundForwarder: { running: true, lastError: null, lastErrorAt: null },
          outboundSender: { running: true, lastError: null, lastErrorAt: null }
        },
        locks: {
          inbox: { ownerId: "fake-lock", held: true, lost: false, lastHeartbeatAt: heartbeatTimestamp(), lastError: null },
          outbox: { ownerId: "fake-lock", held: true, lost: false, lastHeartbeatAt: heartbeatTimestamp(), lastError: null }
        }
      },
      queue: {
        inboundDeadLetterCount: 0,
        inboundCompletedUnboundCount: 0,
        outboundDeadLetterCount: 0
      }
    }));
    return;
  }

  if (url.pathname === "/api/runtime-reliability/v1/shutdown" && request.method === "POST") {
    response.statusCode = 202;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ accepted: true }));
    setTimeout(() => server.close(() => process.exit(0)), 0);
    return;
  }

  response.statusCode = 404;
  response.end("not found");
});

server.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

server.listen(port, host);

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
`;

const computeSha256 = async (filePath: string): Promise<string> => {
  const { createHash } = await import("node:crypto");
  const buffer = await fsp.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
};

const runCommand = async (command: string, args: string[]): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${command} ${args.join(" ")}`));
    });
  });
};
