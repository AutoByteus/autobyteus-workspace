import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { Header, Pax } from "tar";
import { afterEach, describe, expect, it } from "vitest";
import { extractSkillRepositoryArchive } from "../../../../src/skills/installers/skill-repository-archive.js";
import { publicGitHubRequest } from "../../../../src/integrations/github/public-github-request.js";
import { fixture } from "./fixtures.js";

type Spec = { path: string; type?: "File" | "Directory" | "SymbolicLink" | "Link" | "FIFO"; linkpath?: string; body?: string; mode?: number; pax?: string };
const roots: ReturnType<typeof fixture>[] = [];
function archive(specs: Spec[]) {
  const f = fixture(); roots.push(f); f.store.ensureRoot();
  const file = path.join(f.root, "archive.tgz");
  const blocks: Buffer[] = [];
  for (const spec of [{ path: "repo/", type: "Directory" as const }, ...specs]) {
    if (spec.pax) blocks.push(new Pax({ path: spec.pax }).encode()!);
    const body = Buffer.from(spec.body ?? "");
    const block = Buffer.alloc(512);
    new Header({ path: spec.path, type: spec.type ?? "File", linkpath: spec.linkpath, mode: spec.mode ?? 0o755, size: body.length }).encode(block);
    blocks.push(block, body, Buffer.alloc((512 - body.length % 512) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  fs.writeFileSync(file, gzipSync(Buffer.concat(blocks)));
  const output = path.join(f.store.root, "output"); fs.mkdirSync(output);
  return { f, file, output, extract: () => extractSkillRepositoryArchive(file, output, f.store.root) };
}
afterEach(() => roots.splice(0).forEach(root => root.cleanup()));

describe("untrusted skill archive boundary", () => {
  it.each(["/outside", "../outside", "repo/../../outside", "C:/outside", "repo/\\outside", "//host/share", "repo/AUX", "repo/file:stream", "repo/dot."])("rejects path %s before extraction", async unsafe => {
    const a = archive([{ path: unsafe, body: "escape" }]);
    await expect(a.extract()).rejects.toThrow();
    expect(fs.readdirSync(a.output)).toEqual([]);
    expect(fs.existsSync(path.join(a.f.root, "outside"))).toBe(false);
  });
  it("rejects effective PAX traversal and duplicate/case-aliased destinations", async () => {
    for (const specs of [
      [{ path: "repo/placeholder", pax: "../outside" }],
      [{ path: "repo/placeholder", pax: "repo/hi\0../outside" }],
      [{ path: "repo/same" }, { path: "repo/same" }],
      [{ path: "repo/Same" }, { path: "repo/same" }],
      [{ path: "repo/pipe", type: "FIFO" as const }],
    ]) {
      const a = archive(specs);
      await expect(a.extract()).rejects.toThrow();
      expect(fs.readdirSync(a.output)).toEqual([]);
    }
  });
  it.each([
    [{ path: "repo/link", type: "SymbolicLink" as const, linkpath: "../../outside" }],
    [{ path: "repo/link", type: "SymbolicLink" as const, linkpath: "/tmp/outside" }],
    [{ path: "repo/a", type: "SymbolicLink" as const, linkpath: "b" }, { path: "repo/b", type: "SymbolicLink" as const, linkpath: "a" }],
    [{ path: "repo/a", type: "SymbolicLink" as const, linkpath: "missing" }],
    [{ path: "repo/a", type: "SymbolicLink" as const, linkpath: "target" }, { path: "repo/a/child" }],
    [{ path: "repo/hard", type: "Link" as const, linkpath: "../outside" }],
  ])("rejects unsafe link graph %#", async (...specs) => {
    const a = archive(specs);
    await expect(a.extract()).rejects.toThrow();
    expect(fs.readdirSync(a.output)).toEqual([]);
  });
  it("resolves parent components after directory links and rejects directory graph cycles", async () => {
    for (const specs of [
      [
        { path: "repo/deep/", type: "Directory" as const }, { path: "repo/real/", type: "Directory" as const },
        { path: "repo/outside", body: "lexical decoy" },
        { path: "repo/deep/a", type: "SymbolicLink" as const, linkpath: "../real" },
        { path: "repo/deep/b", type: "SymbolicLink" as const, linkpath: "a/../../outside" },
      ],
      [
        { path: "repo/a/", type: "Directory" as const }, { path: "repo/b/", type: "Directory" as const },
        { path: "repo/a/link", type: "SymbolicLink" as const, linkpath: "../b" },
        { path: "repo/b/link", type: "SymbolicLink" as const, linkpath: "../a" },
      ],
      [{ path: "repo/a/", type: "Directory" as const }, { path: "repo/a/link", type: "SymbolicLink" as const, linkpath: "." }],
    ]) {
      const a = archive(specs);
      await expect(a.extract()).rejects.toThrow();
      expect(fs.readdirSync(a.output)).toEqual([]);
    }
  });

  it("preserves executable support, internal symlinks/chains and hardlinks without privileged bits or execution", async () => {
    const a = archive([
      { path: "repo/run.sh", body: "#!/bin/sh\ntouch SHOULD_NOT_EXIST\n", mode: 0o4755 },
      { path: "repo/docs/", type: "Directory" },
      { path: "repo/docs/first", type: "SymbolicLink", linkpath: "../run.sh" },
      { path: "repo/second", type: "SymbolicLink", linkpath: "docs/first" },
      { path: "repo/hard", type: "Link", linkpath: "repo/run.sh" },
    ]);
    const root = await a.extract();
    expect(fs.readFileSync(path.join(root, "second"), "utf8")).toContain("SHOULD_NOT_EXIST");
    expect(fs.readFileSync(path.join(root, "hard"), "utf8")).toContain("SHOULD_NOT_EXIST");
    expect(fs.statSync(path.join(root, "run.sh")).mode & 0o4777).toBe(0o755);
    expect(fs.existsSync(path.join(root, "SHOULD_NOT_EXIST"))).toBe(false);
  });
  it("refuses a substituted extraction root and leaves its external target intact", async () => {
    const a = archive([{ path: "repo/file" }]);
    fs.rmdirSync(a.output);
    const external = path.join(a.f.root, "external"); fs.mkdirSync(external);
    fs.symlinkSync(external, a.output);
    await expect(a.extract()).rejects.toThrow("Unsafe managed");
    expect(fs.readdirSync(external)).toEqual([]);
  });
});

describe("public GitHub redirects", () => {
  it("rejects off-host redirects without requesting the target", async () => {
    const urls: string[] = [];
    const fake = (async (url: string) => { urls.push(url); return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }); }) as typeof fetch;
    await expect(publicGitHubRequest("https://api.github.com/repos/a/b/tarball", fake)).rejects.toThrow("Unsupported");
    expect(urls).toHaveLength(1);
  });
  it("allows HTTPS codeload redirects and propagates cancellation", async () => {
    const signal = new AbortController().signal; let calls = 0;
    const fake = (async (_url: string, init: RequestInit) => {
      expect(init.signal).toBe(signal);
      return ++calls === 1 ? new Response(null, { status: 302, headers: { location: "https://codeload.github.com/a/b/tar.gz/sha" } }) : new Response("data");
    }) as typeof fetch;
    expect(await (await publicGitHubRequest("https://api.github.com/repos/a/b/tarball", fake, signal)).text()).toBe("data");
  });
});
