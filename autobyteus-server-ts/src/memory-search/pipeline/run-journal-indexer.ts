import type { WorkJournalFileVersion } from "../../agent-work-journal/domain/work-journal-models.js";
import { readJournalEntries } from "../../agent-work-journal/reading/journal-entry-reader.js";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import type { MemoryRun } from "../domain/memory-search-models.js";
import { buildJournalCard } from "../index/journal-card-builder.js";
import { chunkJournalEntries } from "../index/journal-chunker.js";
import type { MemorySearchStore } from "../store/memory-search-store.js";

type Journals = Pick<WorkJournalService, "readJournalFile">;

/** The agent as a card names it: the team member or org member when there is one. */
const cardAgentName = (run: MemoryRun): string =>
  [run.agentName, run.teamName ? `in ${run.teamName}` : null, run.orgName ? `in ${run.orgName}` : null].filter(Boolean).join(" ");

/**
 * The Text index for one run's journal files, plus their cards: a file whose content hash changed is read
 * through the journal service, split into entry-aligned chunks and carded; files gone from the journal are
 * removed. Unchanged files cost nothing (MP-003). Returns how many files it re-indexed.
 */
export const indexRunJournals = async (
  run: MemoryRun,
  versions: readonly WorkJournalFileVersion[],
  journals: Journals,
  store: MemorySearchStore,
  onFile: () => void,
): Promise<number> => {
  const stored = new Map(store.journalFiles(run.runKey).map((file) => [file.journalFile, file]));
  let indexed = 0;
  for (const version of versions) {
    if (stored.get(version.journalFile)?.contentSha256 !== version.contentSha256) {
      const markdown = await journals.readJournalFile(run.memoryDir, version.journalFile);
      if (markdown !== null) {
        const { entries } = readJournalEntries(markdown);
        store.replaceJournalFile({
          runKey: run.runKey, journalFile: version.journalFile, contentSha256: version.contentSha256,
          chunks: chunkJournalEntries(entries), card: buildJournalCard(cardAgentName(run), entries),
        });
        indexed++;
      }
    }
    onFile();
  }
  const current = new Set(versions.map((version) => version.journalFile));
  for (const journalFile of stored.keys()) if (!current.has(journalFile)) store.removeJournalFile(run.runKey, journalFile);
  return indexed;
};
