import { defineApplication } from "@autobyteus/application-backend-sdk";
import { addReviewNoteCommand } from "./commands/add-review-note.js";
import { approveBriefCommand } from "./commands/approve-brief.js";
import { createBriefCommand } from "./commands/create-brief.js";
import { rejectBriefCommand } from "./commands/reject-brief.js";
import { onArtifact } from "./event-handlers/on-artifact.js";
import { onRunFailed } from "./event-handlers/on-run-failed.js";
import { onRunOrphaned } from "./event-handlers/on-run-orphaned.js";
import { onRunStarted } from "./event-handlers/on-run-started.js";
import { onRunTerminated } from "./event-handlers/on-run-terminated.js";
import { getBriefDetailQuery } from "./queries/get-brief-detail.js";
import { listBriefsQuery } from "./queries/list-briefs.js";

export default defineApplication({
  definitionContractVersion: "2",
  queries: {
    "briefs.list": listBriefsQuery,
    "briefs.getDetail": getBriefDetailQuery,
  },
  commands: {
    createBrief: createBriefCommand,
    approveBrief: approveBriefCommand,
    rejectBrief: rejectBriefCommand,
    addReviewNote: addReviewNoteCommand,
  },
  eventHandlers: {
    runStarted: onRunStarted,
    runTerminated: onRunTerminated,
    runFailed: onRunFailed,
    runOrphaned: onRunOrphaned,
    artifact: onArtifact,
  },
});
