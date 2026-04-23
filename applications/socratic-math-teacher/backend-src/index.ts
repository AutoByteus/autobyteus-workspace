import { defineApplication } from "@autobyteus/application-backend-sdk";
import { onArtifact } from "./event-handlers/on-artifact.js";
import { onRunFailed } from "./event-handlers/on-run-failed.js";
import { onRunOrphaned } from "./event-handlers/on-run-orphaned.js";
import { onRunStarted } from "./event-handlers/on-run-started.js";
import { onRunTerminated } from "./event-handlers/on-run-terminated.js";
import { executeSocraticMathGraphql } from "./graphql/index.js";
import { createLessonArtifactReconciliationService } from "./services/lesson-artifact-reconciliation-service.js";

export default defineApplication({
  definitionContractVersion: "2",
  lifecycle: {
    onStart: async (context) => {
      await createLessonArtifactReconciliationService(context).reconcilePublishedArtifacts();
    },
  },
  graphql: {
    execute: executeSocraticMathGraphql,
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
