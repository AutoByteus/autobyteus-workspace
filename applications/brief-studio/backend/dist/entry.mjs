import { defineApplication } from "./vendor/application-backend-sdk.js";
import { addReviewNoteCommand } from "./commands/add-review-note.js";
import { approveBriefCommand } from "./commands/approve-brief.js";
import { rejectBriefCommand } from "./commands/reject-brief.js";
import { onArtifact } from "./event-handlers/on-artifact.js";
import { getBriefDetailQuery } from "./queries/get-brief-detail.js";
import { listBriefsQuery } from "./queries/list-briefs.js";
export default defineApplication({
    definitionContractVersion: "1",
    queries: {
        "briefs.list": listBriefsQuery,
        "briefs.getDetail": getBriefDetailQuery,
    },
    commands: {
        approveBrief: approveBriefCommand,
        rejectBrief: rejectBriefCommand,
        addReviewNote: addReviewNoteCommand,
    },
    eventHandlers: {
        artifact: onArtifact,
    },
});
