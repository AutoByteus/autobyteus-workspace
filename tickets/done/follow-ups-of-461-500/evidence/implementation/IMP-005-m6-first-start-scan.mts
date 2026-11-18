// Read-only M-6 measurement: the migration's own folder listing and the byte pre-check; nothing is written.
import fs from "node:fs/promises";
import { listAttachmentLinkFolders } from "/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500/autobyteus-server-ts/src/app-data-migrations/migrations/delegated-run-own-attachment-links/attachment-link-folders.js";
import { listContextFileRecordSources } from "/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500/autobyteus-server-ts/src/app-data-migrations/frozen/server/context-files/services/context-file-record-locators.js";
const memoryDir = process.argv[2]!;
const main = async () => {
const started = Date.now();
let files = 0, bytes = 0, candidates = 0, candidateBytes = 0;
for (const owner of await listAttachmentLinkFolders(memoryDir)) {
  for (const source of await listContextFileRecordSources({ rootDirectories: [], agentDirectories: [owner.folder] })) {
    const data = await fs.readFile(source.filePath);
    files += 1; bytes += data.length;
    if (data.includes("/agent-collaborations/")) { candidates += 1; candidateBytes += data.length; }
  }
}
console.log(JSON.stringify({ files, gb: +(bytes / 1e9).toFixed(2), candidates, candidateMb: +(candidateBytes / 1e6).toFixed(0), seconds: (Date.now() - started) / 1000 }));
};
void main();
