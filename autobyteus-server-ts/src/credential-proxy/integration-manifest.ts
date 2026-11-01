import fs from "node:fs";
import path from "node:path";
import { createServerLogger } from "../logging/server-app-logger.js";
import { SkillLoader } from "../skills/loader.js";

const logger = createServerLogger("credential-proxy.integration-manifest");

/** Sources are re-read on every page load and run preparation; each distinct problem is logged once. */
const loggedProblems = new Set<string>();
export const warnOnce = (message: string): void => {
  if (loggedProblems.has(message)) return;
  loggedProblems.add(message);
  logger.warn(message);
};

/** An integration's ID: its folder name (the manifest contract). */
export const INTEGRATION_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
/** A prerequisite is a tool name checked on `PATH`, never a path or a command line. */
const TOOL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const MANIFEST_FIELDS = new Set(["name", "description", "token", "prerequisites"]);
const MAX_ICON_BYTES = 64 * 1024;

/** One valid integration folder, as the manifest contract describes it (no state, no source). */
export type IntegrationManifestEntry = Readonly<{
  id: string;
  name: string;
  description: string;
  /** `token.help`: how to create the token (repository text, shown as text). Null when the integration asks for no token. */
  tokenHelp: string | null;
  prerequisites: readonly string[];
  /** The `name` in the folder's `SKILL.md`: the skill an agent is given to use the integration. */
  skillName: string;
  /** `icon.svg` as a `data:image/svg+xml` URL, only when it is an SVG document under 64 KB; shown only as an `<img>`. */
  iconDataUrl: string | null;
  /** The integration folder (resolved). */
  folderPath: string;
}>;

const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

class ManifestProblem extends Error {}

const readManifestFields = (folder: string): Pick<IntegrationManifestEntry, "name" | "description" | "tokenHelp" | "prerequisites"> => {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(folder, "integration.json"), "utf8"));
  } catch (error) {
    throw new ManifestProblem(`integration.json is not readable JSON (${error instanceof Error ? error.message : "error"})`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ManifestProblem("integration.json is not an object");
  const manifest = raw as Record<string, unknown>;
  const unknown = Object.keys(manifest).filter((key) => !MANIFEST_FIELDS.has(key));
  if (unknown.length > 0) throw new ManifestProblem(`unknown field(s) ${unknown.join(", ")}`);
  if (!nonEmptyString(manifest.name)) throw new ManifestProblem("'name' must be a non-empty string");
  if (!nonEmptyString(manifest.description)) throw new ManifestProblem("'description' must be a non-empty string");

  let tokenHelp: string | null = null;
  if (manifest.token !== undefined) {
    const token = manifest.token;
    if (!token || typeof token !== "object" || Array.isArray(token)) throw new ManifestProblem("'token' must be an object");
    const tokenFields = Object.keys(token);
    if (tokenFields.some((key) => key !== "help")) throw new ManifestProblem("'token' may only hold 'help'");
    const help = (token as Record<string, unknown>).help;
    if (!nonEmptyString(help)) throw new ManifestProblem("'token.help' must be a non-empty string");
    tokenHelp = help;
  }

  let prerequisites: string[] = [];
  if (manifest.prerequisites !== undefined) {
    const tools = manifest.prerequisites;
    if (!Array.isArray(tools) || !tools.every((tool) => typeof tool === "string" && TOOL_NAME_PATTERN.test(tool))) {
      throw new ManifestProblem("'prerequisites' must be a list of tool names");
    }
    prerequisites = [...new Set(tools as string[])];
  }
  return { name: manifest.name.trim(), description: manifest.description.trim(), tokenHelp, prerequisites };
};

const readSkillName = (folder: string): string => {
  let content: string;
  try {
    content = fs.readFileSync(path.join(folder, "SKILL.md"), "utf8");
  } catch {
    throw new ManifestProblem("SKILL.md is missing");
  }
  let name: string;
  try {
    name = new SkillLoader().parseFrontmatter(content).metadata.name;
  } catch (error) {
    throw new ManifestProblem(`SKILL.md has no valid front matter (${error instanceof Error ? error.message : "error"})`);
  }
  if (!nonEmptyString(name)) throw new ManifestProblem("SKILL.md has no 'name'");
  return name.trim();
};

/** Whether the text is an SVG document: an `<svg>` root after an optional XML declaration and comments. */
const isSvgDocument = (text: string): boolean => {
  const body = text
    .replace(/^﻿/, "")
    .replace(/^\s*<\?xml[^>]*\?>/, "")
    .replace(/^(\s*<!--[\s\S]*?-->)*/, "")
    .trim();
  return /^<svg[\s>]/.test(body) && body.endsWith("</svg>");
};

const readIcon = (folder: string, id: string): string | null => {
  const iconPath = path.join(folder, "icon.svg");
  let bytes: Buffer;
  try {
    const stat = fs.statSync(iconPath);
    if (!stat.isFile()) return null;
    if (stat.size > MAX_ICON_BYTES) {
      warnOnce(`Integration '${id}' (${folder}): icon.svg is larger than 64 KB; the card shows a letter instead.`);
      return null;
    }
    bytes = fs.readFileSync(iconPath);
  } catch {
    return null; // no icon: the card shows a letter
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = "";
  }
  if (!isSvgDocument(text)) {
    warnOnce(`Integration '${id}' (${folder}): icon.svg is not an SVG document; the card shows a letter instead.`);
    return null;
  }
  return `data:image/svg+xml;base64,${bytes.toString("base64")}`;
};

/**
 * Reads one integration folder by the manifest contract (`autobyteus-integrations` `docs/integration-manifest.md`).
 * Only a folder with an `integration.json` is a candidate: imported skill sources also hold plain skills (a folder
 * with only `SKILL.md`), which are not integrations and get no warning. An invalid candidate is skipped: `null`, with a
 * warning naming the folder and the reason (DESIGN.md rule 7).
 */
export const parseIntegrationFolder = (folder: string): IntegrationManifestEntry | null => {
  const resolved = path.resolve(folder);
  const id = path.basename(resolved);
  if (!fs.existsSync(path.join(resolved, "integration.json"))) return null;
  try {
    if (!INTEGRATION_ID_PATTERN.test(id)) throw new ManifestProblem(`the folder name is not a valid integration ID (${INTEGRATION_ID_PATTERN})`);
    const fields = readManifestFields(resolved);
    const skillName = readSkillName(resolved);
    return Object.freeze({
      id,
      ...fields,
      prerequisites: Object.freeze([...fields.prerequisites]),
      skillName,
      iconDataUrl: readIcon(resolved, id),
      folderPath: resolved,
    });
  } catch (error) {
    if (!(error instanceof ManifestProblem)) throw error;
    warnOnce(`Integration folder ${resolved} is skipped: ${error.message}.`);
    return null;
  }
};

/** Every valid integration in a source root: its top-level folders, read one by one; invalid ones are skipped. */
export const parseIntegrationSource = (rootPath: string): IntegrationManifestEntry[] => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .flatMap((entry) => {
      const parsed = parseIntegrationFolder(path.join(rootPath, entry.name));
      return parsed ? [parsed] : [];
    });
};
