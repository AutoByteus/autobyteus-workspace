import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { list, extract, type ReadEntry } from "tar";
import { assertOwnedDirectory } from "./managed-skill-paths.js";

type Entry = { name: string; type: string; link: string; mode: number };
const safePath = (value: string): string => {
  // Reject Windows aliases too, even when the server currently runs on POSIX.
  if (!value || /[\\\x00-\x1f:]/.test(value) || value.startsWith("/") ||
      value.split("/").some((part) => part === ".." || /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error(`Unsafe repository archive path: ${JSON.stringify(value)}`);
  }
  return path.posix.normalize(value).replace(/\/$/, "");
};
const describe = (entry: ReadEntry): Entry => ({
  name: safePath(entry.path), type: entry.type, link: entry.linkpath ?? "", mode: (entry.mode ?? 0o644) & 0o777,
});

/** The same tar parser validates effective PAX/long paths and extracts regular entries.
 * Links are withheld entirely until the complete repository-local target graph validates. */
export async function extractSkillRepositoryArchive(archive: string, output: string, ownedRoot: string): Promise<string> {
  assertOwnedDirectory(ownedRoot, output);
  const entries = new Map<string, Entry>();
  const destinations = new Set<string>();
  let invalid: Error | null = null;
  const parser = list({ strict: true, onReadEntry(entry) {
    try {
      const item = describe(entry);
      if (!["File", "Directory", "SymbolicLink", "Link"].includes(item.type)) throw new Error("Unsupported archive entry type.");
      const key = item.name.normalize("NFC").toLowerCase();
      if (destinations.has(key)) {
        throw new Error(`Duplicate repository archive destination: ${item.name}`);
      }
      destinations.add(key);
      entries.set(item.name, item);
    } catch (error) { invalid ??= error as Error; }
  } });
  parser.on("meta", (raw: string) => {
    // The patched parser truncates PAX values at NUL. Reject ambiguous metadata rather
    // than accepting the truncated filename. GNU long-name terminal NUL padding is not
    // part of its effective path and remains allowed.
    if (raw.replace(/\0+$/, "").includes("\0")) invalid ??= new Error("NUL in repository archive metadata.");
  });
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(archive);
    parser.on("error", error => { stream.destroy(); reject(error); });
    parser.on("end", resolve);
    stream.on("error", error => { parser.abort(error); reject(error); });
    stream.pipe(parser);
  });
  if (invalid) throw invalid;
  const wrappers = new Set([...entries.keys()].map((name) => name.split("/")[0]!));
  if (wrappers.size !== 1) throw new Error("Archive must contain one repository wrapper directory.");
  const wrapper = [...wrappers][0]!;
  if (entries.get(wrapper)?.type !== "Directory") throw new Error("Repository wrapper must be a directory.");

  const isLink = (entry: Entry) => entry.type === "SymbolicLink" || entry.type === "Link";
  const inside = (name: string) => name.startsWith(wrapper + "/");
  for (const entry of entries.values()) {
    for (let parent = path.posix.dirname(entry.name); parent !== "."; parent = path.posix.dirname(parent)) {
      const ancestor = entries.get(parent);
      if (ancestor && ancestor.type !== "Directory") throw new Error("Archive entry traverses a non-directory or link.");
    }
  }
  const resolvedLinks = new Map<string, string>();
  const resolveTarget = (name: string, visiting: Set<string>): string => {
    if (visiting.has(name)) throw new Error("Cyclic repository link.");
    const entry = entries.get(name);
    if (!entry) {
      // Tar need not include explicit directory entries for every parent.
      if ([...entries.keys()].some((key) => key.startsWith(name + "/"))) return name;
      throw new Error(`Broken repository link: ${name}`);
    }
    if (!isLink(entry)) return name;
    visiting.add(name);
    const raw = entry.link;
    if (!raw || /[\\\x00-\x1f:]/.test(raw) || raw.startsWith("/")) throw new Error("Unsafe repository link target.");
    // Resolve each component before interpreting '..'. Normalizing the whole string first
    // would erase a directory symlink and could certify a target that escapes at runtime.
    let components = entry.type === "Link" ? [] : path.posix.dirname(name).split("/");
    const pieces = raw.split("/");
    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index]!;
      if (!piece || piece === ".") continue;
      if (piece === "..") {
        if (components.length <= 1) throw new Error("Repository link escapes its wrapper.");
        components.pop();
        continue;
      }
      components.push(piece);
      const prefix = components.join("/");
      if (components[0] !== wrapper) throw new Error("Repository link escapes its wrapper.");
      const targetEntry = entries.get(prefix);
      if (targetEntry && isLink(targetEntry)) {
        components = resolveTarget(prefix, new Set(visiting)).split("/");
      } else if (!targetEntry && ![...entries.keys()].some(key => key.startsWith(prefix + "/"))) {
        throw new Error("Broken repository link.");
      } else if (index < pieces.length - 1 && targetEntry && targetEntry.type !== "Directory") {
        throw new Error("Repository link traverses a file.");
      }
    }
    const target = components.join("/");
    if (!inside(target)) throw new Error("Repository link escapes its wrapper.");
    const resolved = resolveTarget(target, visiting);
    if (entry.type === "Link" && entries.get(resolved)?.type !== "File") throw new Error("Hard link must target a regular repository file.");
    resolvedLinks.set(name, resolved);
    return resolved;
  };
  for (const entry of entries.values()) if (isLink(entry)) resolveTarget(entry.name, new Set());

  // Directory symlinks can form cycles through ordinary child edges even when the
  // immediate link-target chain is acyclic (a/link -> b, b/link -> a).
  const edges = new Map<string, Set<string>>();
  const edge = (from: string, to: string) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)!.add(to);
  };
  for (const name of entries.keys()) {
    const parts = name.split("/");
    for (let index = 1; index < parts.length; index++) {
      edge(parts.slice(0, index).join("/"), parts.slice(0, index + 1).join("/"));
    }
  }
  for (const [name, target] of resolvedLinks) edge(name, target);
  const completed = new Set<string>();
  const visit = (node: string, ancestors: Set<string>) => {
    if (ancestors.has(node)) throw new Error("Cyclic repository directory link.");
    if (completed.has(node)) return;
    const next = new Set(ancestors); next.add(node);
    for (const child of edges.get(node) ?? []) visit(child, next);
    completed.add(node);
  };
  visit(wrapper, new Set());

  assertOwnedDirectory(ownedRoot, output);
  await extract({ file: archive, cwd: output, strict: true, preservePaths: false,
    preserveOwner: false, chmod: true,
    filter(_name, raw) {
      const entry = raw as ReadEntry;
      const item = describe(entry);
      entry.mode = item.mode;
      return item.type === "File" || item.type === "Directory";
    },
  });
  for (const [name, target] of resolvedLinks) {
    const destination = path.join(output, name);
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o755 });
    assertOwnedDirectory(ownedRoot, path.dirname(destination));
    if (entries.get(name)!.type === "Link") await fs.link(path.join(output, target), destination);
    else await fs.symlink(entries.get(name)!.link, destination,
      entries.get(target)?.type === "File" ? "file" : "dir");
  }
  return path.join(output, wrapper);
}
