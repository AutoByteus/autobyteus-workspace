import { defineApplication } from "@autobyteus/application-backend-sdk";
import { onArtifact } from "./event-handlers/on-artifact.js";
import { onRunFailed } from "./event-handlers/on-run-failed.js";
import { onRunOrphaned } from "./event-handlers/on-run-orphaned.js";
import { onRunStarted } from "./event-handlers/on-run-started.js";
import { onRunTerminated } from "./event-handlers/on-run-terminated.js";
import { executeBriefStudioGraphql } from "./graphql/index.js";

export default defineApplication({
  definitionContractVersion: "2",
  graphql: {
    execute: executeBriefStudioGraphql,
  },
  eventHandlers: {
    runStarted: onRunStarted,
    runTerminated: onRunTerminated,
    runFailed: onRunFailed,
    runOrphaned: onRunOrphaned,
    artifact: onArtifact,
  },
});
