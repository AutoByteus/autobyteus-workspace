import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PHONE_WEBSOCKET_ROUTES, routeAccessFor } from "../../src/api/security/node-route-permissions.js";

/**
 * The node access gate is the only place that authorizes (node access model §2, design M-3/M-4):
 * - every WebSocket route of the node is registered through `registerGatedWebSocketRoute` (refusals close with
 *   4401/4403 and the code), except `/graphql` (Mercurius subscriptions) and `/rest/remote/run-observations` (a
 *   peer's stream), which get HTTP refusals;
 * - every phone WebSocket route is a registered route, and every registered WebSocket route has a permission;
 * - route handlers only read what the gate established (the client identity), register their sockets and know the
 *   browser WebSocket credential's query key; they never decide access themselves;
 * - every scenario of the contract's table (NAS-01…) is named by at least one test.
 */

const THIS_FILE = fileURLToPath(import.meta.url);
const SERVER_ROOT = resolve(dirname(THIS_FILE), "../..");
const REPOSITORY_ROOT = resolve(SERVER_ROOT, "..");
const SRC = join(SERVER_ROOT, "src");
const API = join(SRC, "api");
const SECURITY = join(API, "security");
const CONTRACT = join(SERVER_ROOT, "docs", "design", "node_access_model.md");

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".nuxt", ".output", "dist", "dist-electron", "coverage", ".git", "build"]);

const listFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  if (SKIPPED_DIRECTORIES.has(name)) return [];
  const path = join(root, name);
  return statSync(path).isDirectory() ? listFiles(path) : [path];
});

const sourceFiles = (root: string) => listFiles(root).filter((path) => path.endsWith(".ts"));
const read = (path: string) => readFileSync(path, "utf8");
const inside = (path: string, directory: string) => !relative(directory, path).startsWith("..");

/** The route patterns registered through `registerGatedWebSocketRoute(app, "<pattern>", …)`. */
const gatedWebSocketRoutes = (): string[] => sourceFiles(join(API, "websocket")).flatMap((file) =>
  [...read(file).matchAll(/registerGatedWebSocketRoute(?:<[\s\S]*?>)?\(\s*app,\s*"([^"]+)"/g)].map((match) => match[1]!));

const ALLOWED_GATE_IMPORTS = new Set([
  "getClientIdentity",
  "registerOpenSocket",
  "getWebSocketRefusal",
  "WEBSOCKET_ACCESS_TOKEN_QUERY_KEY",
]);

describe("node access boundaries", () => {
  it("registers every node WebSocket route behind the gate, except /graphql and /rest/remote/run-observations", () => {
    const ungated = sourceFiles(API).flatMap((file) =>
      [...read(file).matchAll(/websocket:\s*true/g)].map(() => relative(SERVER_ROOT, file)));
    expect(ungated.sort()).toEqual([
      "src/api/rest/remote.ts",
      "src/api/websocket/gated-websocket-route.ts",
    ]);
    expect(read(join(API, "rest", "remote.ts"))).toMatch(/app\.get\("\/remote\/run-observations", \{ websocket: true \}/);
  });

  it("lists only registered WebSocket routes as phone routes, and every registered one has a permission (owner, phones only when listed)", () => {
    const registered = gatedWebSocketRoutes();
    expect(registered.length).toBeGreaterThanOrEqual(PHONE_WEBSOCKET_ROUTES.size);
    for (const phoneRoute of PHONE_WEBSOCKET_ROUTES) expect(registered, phoneRoute).toContain(phoneRoute);
    for (const route of registered) {
      const access = routeAccessFor({ method: "GET", route, isWebSocketUpgrade: true });
      expect(access.kind, route).toBe("clients");
      if (access.kind !== "clients") continue;
      expect([...access.permitted].sort(), route).toEqual(PHONE_WEBSOCKET_ROUTES.has(route) ? ["owner", "phone"] : ["owner"]);
    }
  });

  it("leaves access decisions to the gate: handlers read the established identity and never import the gate or the permissions", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (inside(file, SECURITY)) continue;
      const text = read(file);
      const name = relative(SERVER_ROOT, file);
      for (const match of text.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"([^"]*\/node-access-gate\.js)"/g)) {
        const names = match[1]!.split(",").map((part) => part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!).filter(Boolean);
        const allowed = name === "src/compositions/node-access-composition.ts" ? new Set([...ALLOWED_GATE_IMPORTS, "NodeAccessGate"]) : ALLOWED_GATE_IMPORTS;
        for (const imported of names) if (!allowed.has(imported)) offenders.push(`${name} imports ${imported}`);
      }
      if (/from\s*"[^"]*\/node-route-permissions\.js"/.test(text)) offenders.push(`${name} imports the route permissions`);
    }
    expect(offenders).toEqual([]);
  });

  it("names every scenario of the contract's table (NAS-01…) in at least one test", () => {
    const contractIds = [...new Set([...read(CONTRACT).matchAll(/^\| (NAS-\d{2}) \|/gm)].map((match) => match[1]!))];
    expect(contractIds.length).toBeGreaterThanOrEqual(38);

    const testNames: string[] = [];
    const scriptTests = join(REPOSITORY_ROOT, "scripts", "tests");
    const testFiles = [
      ...listFiles(join(SERVER_ROOT, "tests")),
      ...listFiles(join(REPOSITORY_ROOT, "autobyteus-web")),
      ...listFiles(scriptTests),
    ].filter((file) => /\.(test|spec)\.(ts|mts|js|mjs)$/.test(file) || (file.endsWith(".py") && inside(file, scriptTests)));
    for (const file of testFiles) {
      const text = read(file);
      if (file.endsWith(".py")) {
        // `def test_nas_03_nas_32_…` names NAS-03 and NAS-32.
        for (const match of text.matchAll(/def (test_\w+)/g)) testNames.push(match[1]!.replace(/nas_(\d{2})/g, "NAS-$1").replace(/_/g, " "));
        continue;
      }
      for (const match of text.matchAll(/\b(?:it|test|describe)(?:\.[A-Za-z]+(?:\([^)]*\))?)*\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
        testNames.push(match[2]!);
      }
    }
    const unnamed = contractIds.filter((id) => !testNames.some((name) => new RegExp(`\\b${id}\\b`).test(name)));
    expect(unnamed).toEqual([]);
  });
});
