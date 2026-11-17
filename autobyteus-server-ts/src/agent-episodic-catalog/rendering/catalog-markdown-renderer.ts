import type { AgentCatalog, CatalogEntry, CatalogJournalFile } from "../domain/episodic-catalog-models.js";

/**
 * The Markdown of the episodic files, exactly as `episodic-catalog-contract.md` §2 and §3 give them. Nothing here reads
 * the clock or the disk, so the same catalog always renders to the same bytes (an unchanged file is never rewritten).
 */

const MAINTAINED_NOTE = "Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.";

/** Plain code-point order, so the files do not depend on the server's locale. */
const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Oldest first by start; `start unknown` last; equal starts by run ID (§2.2). */
const compareEntries = (a: CatalogEntry, b: CatalogEntry): number => {
  if (a.startedAt !== b.startedAt) {
    if (a.startedAt === null) return 1;
    if (b.startedAt === null) return -1;
    return compareText(a.startedAt, b.startedAt);
  }
  return compareText(a.runId, b.runId);
};

const sortedEntries = (catalog: AgentCatalog): CatalogEntry[] => [...catalog.entries].sort(compareEntries);

/**
 * §2.3: the newest run's agent name as discovery reports it (the last run with a known start, else the last run);
 * a catalog with no runs uses its decoded definition ID.
 */
const agentNameOf = (catalog: AgentCatalog, sorted: readonly CatalogEntry[]): string => {
  const newest = [...sorted].reverse().find((entry) => entry.startedAt !== null) ?? sorted.at(-1);
  return newest ? newest.agentName : catalog.agentDefinitionId;
};

const runCount = (count: number): string => (count === 1 ? "1 run" : `${count} runs`);

/** Under 1,024 bytes in B; under 1 MiB in whole KB; else MB with one decimal (§2.2). */
export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const heading = (entry: CatalogEntry): string => {
  if (entry.startedAt === null) return `## start unknown · ${entry.runId}`;
  if (entry.lastActivityAt === null) return `## ${entry.startedAt} UTC · ${entry.runId}`;
  return `## ${entry.startedAt} → ${entry.lastActivityAt} UTC · ${entry.runId}`;
};

const fileLine = (file: CatalogJournalFile): string => (file.from && file.to
  ? `  - ${file.name} · ${file.from} – ${file.to} · ${formatSize(file.sizeBytes)}`
  : `  - ${file.name} · ${formatSize(file.sizeBytes)}`);

const entryLines = (entry: CatalogEntry): string[] => [
  heading(entry),
  ...(entry.taskTitle ? [`- About: ${entry.taskTitle}`] : []),
  ...(entry.workspace ? [`- Workspace: \`${entry.workspace}\``] : []),
  ...(entry.journal
    ? [`- Journal: \`${entry.journal.folder}\``, ...entry.journal.files.map(fileLine)]
    : [`- Journal: no journal yet (run folder \`${entry.memoryDir}\`)`]),
];

/** `<memory>/episodic/<folder name>/catalog.md` (§2). */
export const renderCatalog = (catalog: AgentCatalog): string => {
  const sorted = sortedEntries(catalog);
  const lines = [
    `# Episodic catalog: ${agentNameOf(catalog, sorted)}`,
    "",
    sorted.length ? `${runCount(sorted.length)}, oldest first.` : "0 runs.",
    MAINTAINED_NOTE,
    ...sorted.flatMap((entry) => ["", ...entryLines(entry)]),
  ];
  return `${lines.join("\n")}\n`;
};

/** `<memory>/episodic/index.md` (§3): every catalog, by agent name, then folder name. */
export const renderIndex = (catalogs: readonly AgentCatalog[]): string => {
  const rows = catalogs.map((catalog) => {
    const sorted = sortedEntries(catalog);
    const lastActivity = sorted.reduce<string | null>((newest, entry) =>
      entry.lastActivityAt !== null && (newest === null || entry.lastActivityAt > newest) ? entry.lastActivityAt : newest, null);
    const name = agentNameOf(catalog, sorted);
    const activity = lastActivity ? `last activity ${lastActivity} UTC` : "no activity";
    return { name, folderName: catalog.folderName, line: `- ${name} · \`${catalog.folderName}/catalog.md\` · ${runCount(sorted.length)} · ${activity}` };
  }).sort((a, b) => compareText(a.name, b.name) || compareText(a.folderName, b.folderName));
  const lines = ["# Episodic catalogs on this node", "", "One folder per agent; each holds catalog.md."];
  if (rows.length) lines.push("", ...rows.map((row) => row.line));
  return `${lines.join("\n")}\n`;
};
