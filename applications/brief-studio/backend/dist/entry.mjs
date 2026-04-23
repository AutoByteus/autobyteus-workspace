import { defineApplication } from "./vendor/application-backend-sdk.js";
import { onArtifact } from "./event-handlers/on-artifact.js";
import { onRunFailed } from "./event-handlers/on-run-failed.js";
import { onRunOrphaned } from "./event-handlers/on-run-orphaned.js";
import { onRunStarted } from "./event-handlers/on-run-started.js";
import { onRunTerminated } from "./event-handlers/on-run-terminated.js";
import { executeBriefStudioGraphql } from "./graphql/index.js";
import { createBriefArtifactReconciliationService } from "./services/brief-artifact-reconciliation-service.js";
export default defineApplication({
    definitionContractVersion: "2",
    lifecycle: {
        onStart: async (context) => {
            await createBriefArtifactReconciliationService(context).reconcilePublishedArtifacts();
        },
    },
    graphql: {
        execute: executeBriefStudioGraphql,
    },
    eventHandlers: {
        runStarted: onRunStarted,
        runTerminated: onRunTerminated,
        runFailed: onRunFailed,
        runOrphaned: onRunOrphaned,
    },
    artifactHandlers: {
        persisted: onArtifact,
    },
});
