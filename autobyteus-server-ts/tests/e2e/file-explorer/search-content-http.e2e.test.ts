/**
 * AC-001–003: real socket GraphQL search joins protected REST PDF/text readers.
 * No model/auth secrets. Own AppConfig data, database (standard Vitest setup),
 * ephemeral listener and synthetic two-page PDF; no user workspace or mocked reader.
 * Clean shell: pnpm -C autobyteus-server-ts exec vitest run
 * tests/e2e/file-explorer/search-content-http.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { registerGraphql } from "../../../src/api/graphql/index.js";
import { registerWorkspaceRoutes } from "../../../src/api/rest/workspaces.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

const pdfBytes = fs.readFileSync(fileURLToPath(new URL("../../../../test-support/file-explorer/resume-preview.pdf", import.meta.url)));
const pdfPath = "applications/nested/resume sample.pdf";
const textPath = "applications/nested/resume-notes.md";
const text = "# Synthetic resume notes\n\nCurrent workspace text reader.\n";
const sentinel = "OUTSIDE-SENTINEL-DO-NOT-RETURN";

describe("search to protected content over real HTTP", () => {
  let app: FastifyInstance;
  let owned: string;
  let root: string;
  let base: string;
  let id: string;
  const manager = getWorkspaceManager();

  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${base}/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    expect(response.status).toBe(200);
    const result = await response.json() as { errors?: unknown[]; data: any };
    expect(result.errors).toBeUndefined();
    return result.data;
  };
  const content = (locator: string) => fetch(`${base}/rest/workspaces/${id}/content?${new URLSearchParams({ path: locator })}`);

  beforeAll(async () => {
    owned = fs.mkdtempSync(path.join(os.tmpdir(), "search-content-http-"));
    root = path.join(owned, "workspace");
    fs.mkdirSync(path.join(root, "applications/nested"), { recursive: true });
    fs.mkdirSync(path.join(owned, "workspace-sibling"));
    fs.writeFileSync(path.join(root, pdfPath), pdfBytes);
    fs.writeFileSync(path.join(root, textPath), text);
    fs.writeFileSync(path.join(owned, "outside.txt"), sentinel);
    fs.writeFileSync(path.join(owned, "workspace-sibling/leak.txt"), sentinel);
    fs.mkdirSync(path.join(owned, "data"));
    appConfigProvider.initialize({ appDataDir: path.join(owned, "data") });
    app = fastify();
    await app.register(registerGraphql);
    await app.register(registerWorkspaceRoutes, { prefix: "/rest" });
    base = await app.listen({ port: 0, host: "127.0.0.1" });
    const created = await gql('mutation($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId } }', { input: { rootPath: root } });
    id = created.createWorkspace.workspaceId;
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    try {
      // This focused server has no process run-supervisor: close only our explorer,
      // not the product "remove workspace" operation (which requires that supervisor).
      if (id) {
        await manager.getWorkspaceById(id)?.close();
        (manager as unknown as { activeWorkspaces: Map<string, unknown> }).activeWorkspaces.delete(id);
      }
    } finally {
      if (owned) fs.rmSync(owned, { recursive: true, force: true });
    }
  });

  it("returns exact relative locators and full PDF bytes without expanding parent folders", async () => {
    const data = await gql('query($id: String!, $query: String!) { searchFiles(workspaceId: $id, query: $query) }', { id, query: "resume" });
    expect(data.searchFiles).toHaveLength(2);
    expect(new Set(data.searchFiles)).toEqual(new Set([pdfPath, textPath]));
    const response = await content(data.searchFiles.find((entry: string) => entry.endsWith(".pdf")));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdfBytes);
  });

  it("uses identical text/tree/search locators through the normal GraphQL reader", async () => {
    const folder = await gql('query($id: String!) { folderChildren(workspaceId: $id, folderPath: "applications/nested") }', { id });
    expect(JSON.parse(folder.folderChildren).children.map((entry: any) => entry.path)).toContain(textPath);
    const search = await gql('query($id: String!) { searchFiles(workspaceId: $id, query: "resume-notes") }', { id });
    expect(search.searchFiles).toEqual([textPath]);
    const read = await gql('query($id: String!, $path: String!) { fileContent(workspaceId: $id, filePath: $path) }', { id, path: search.searchFiles[0] });
    expect(read.fileContent).toBe(text);
    const response = await content(search.searchFiles[0]);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(text);
  });

  it.each([
    ["absolute in-root", () => path.join(root, pdfPath)],
    ["absolute outside", () => path.join(owned, "outside.txt")],
    ["parent traversal", () => "../outside.txt"],
    ["same-prefix sibling", () => "../workspace-sibling/leak.txt"],
  ])("denies %s with existing400 and no fixture/outside bytes", async (_kind, locator) => {
    const response = await content(locator());
    expect(response.status).toBe(400);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ detail: "Access denied: Path resolves outside the workspace boundary." });
    expect(body).not.toContain(sentinel);
    expect(body).not.toContain("%PDF");
  });
});
