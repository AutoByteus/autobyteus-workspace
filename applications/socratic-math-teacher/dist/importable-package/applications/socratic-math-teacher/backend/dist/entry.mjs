// ../../autobyteus-application-backend-sdk/dist/launch-profile.js
var APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE = "PRELOADED_ONLY";
var normalizeSkillAccessMode = (value) => value ?? APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE;
var requireWorkspaceRootPath = (value, label) => {
  const normalized = value?.trim() ?? "";
  if (!normalized)
    throw new Error(`workspaceRootPath is required for ${label}.`);
  return normalized;
};
var buildEffectiveTeamRunLaunch = (input) => {
  if (input.configuration.resourceKind !== "AGENT_TEAM") {
    throw new Error("Runnable AGENT_TEAM configuration is required.");
  }
  const skillAccessMode = normalizeSkillAccessMode(input.skillAccessMode);
  return {
    kind: "AGENT_TEAM",
    mode: "memberConfigs",
    memberConfigs: input.configuration.leaves.map((leaf) => ({
      memberName: leaf.memberName,
      memberRouteKey: leaf.memberRouteKey ?? leaf.memberName,
      agentDefinitionId: leaf.agentDefinitionId,
      workspaceRootPath: requireWorkspaceRootPath(leaf.workspaceRootPath, leaf.memberRouteKey ?? leaf.memberName),
      llmModelIdentifier: leaf.llmModelIdentifier,
      autoExecuteTools: true,
      skillAccessMode,
      runtimeKind: leaf.runtimeKind,
      ...leaf.llmConfig === null ? {} : { llmConfig: structuredClone(leaf.llmConfig) }
    }))
  };
};

// ../../autobyteus-application-backend-sdk/dist/application-agent-target-address.js
var requireBindingId = (binding) => {
  const bindingId = typeof binding?.bindingId === "string" ? binding.bindingId.trim() : "";
  if (!bindingId) {
    throw new Error("Application agent target address requires binding.bindingId.");
  }
  return bindingId;
};
var requireRuntimeSubject = (binding, expectedSubject) => {
  if (binding.runtime?.subject === expectedSubject)
    return;
  if (expectedSubject === "AGENT_RUN") {
    throw new Error("Application agent target address requires an AGENT_RUN binding.");
  }
  throw new Error("Application agent-team target address requires a TEAM_RUN binding.");
};
var createApplicationAgentTeamMemberTargetAddress = (binding, memberRouteKey) => {
  const bindingId = requireBindingId(binding);
  requireRuntimeSubject(binding, "TEAM_RUN");
  const normalizedMemberRouteKey = typeof memberRouteKey === "string" ? memberRouteKey.trim() : "";
  if (!normalizedMemberRouteKey) {
    throw new Error("Application agent-team member target address requires memberRouteKey.");
  }
  const members = Array.isArray(binding.runtime.members) ? binding.runtime.members : [];
  if (!members.some((member) => member?.memberRouteKey === normalizedMemberRouteKey)) {
    throw new Error(`Application agent-team binding '${bindingId}' does not contain memberRouteKey '${normalizedMemberRouteKey}'.`);
  }
  return {
    bindingId,
    target: {
      kind: "AGENT_TEAM_MEMBER",
      memberRouteKey: normalizedMemberRouteKey
    }
  };
};

// ../../autobyteus-application-backend-sdk/dist/index.js
var defineApplication = (definition) => definition;

// backend-src/services/lesson-artifact-reconciliation-service.ts
import { randomUUID as randomUUID2 } from "node:crypto";

// backend-src/repositories/app-database.ts
import { DatabaseSync } from "node:sqlite";
var withAppDatabase = (appDatabasePath, fn) => {
  const db = new DatabaseSync(appDatabasePath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
};
var withTransaction = (db, fn) => {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
    }
    throw error;
  }
};

// backend-src/repositories/lesson-message-repository.ts
var mapRow = (row) => ({
  messageId: row.message_id,
  lessonId: row.lesson_id,
  role: row.role,
  kind: row.kind,
  body: row.body,
  createdAt: row.created_at
});
var createLessonMessageRepository = (db) => ({
  insertMessage(input) {
    const result = db.prepare(
      `INSERT OR IGNORE INTO lesson_messages (message_id, lesson_id, role, kind, body, created_at, source_event_id, source_revision_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.messageId,
      input.lessonId,
      input.role,
      input.kind,
      input.body,
      input.createdAt,
      input.sourceEventId ?? null,
      input.sourceRevisionId ?? null
    );
    return Number(result.changes ?? 0) > 0;
  },
  listByLessonId(lessonId) {
    const rows = db.prepare(
      `SELECT message_id, lesson_id, role, kind, body, created_at
         FROM lesson_messages
         WHERE lesson_id = ?
         ORDER BY datetime(created_at) ASC, message_id ASC`
    ).all(lessonId);
    return rows.map(mapRow);
  }
});

// backend-src/repositories/lesson-repository.ts
var mapRow2 = (row) => ({
  lessonId: row.lesson_id,
  prompt: row.prompt,
  status: row.status,
  latestBindingId: row.latest_binding_id,
  latestRunId: row.latest_run_id,
  latestBindingStatus: row.latest_binding_status,
  lastErrorMessage: row.last_error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  closedAt: row.closed_at,
  artifactCatchupCompletedAt: row.artifact_catchup_completed_at
});
var createLessonRepository = (db) => ({
  getById(lessonId) {
    const row = db.prepare(
      `SELECT lesson_id, prompt, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, closed_at, artifact_catchup_completed_at
         FROM lessons
         WHERE lesson_id = ?`
    ).get(lessonId);
    return row ? mapRow2(row) : null;
  },
  getByBindingId(bindingId) {
    const row = db.prepare(
      `SELECT lesson_id, prompt, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, closed_at, artifact_catchup_completed_at
           FROM lessons
          WHERE latest_binding_id = ?`
    ).get(bindingId);
    return row ? mapRow2(row) : null;
  },
  listSummaries() {
    const rows = db.prepare(
      `SELECT lesson_id, prompt, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, closed_at, artifact_catchup_completed_at
         FROM lessons
         ORDER BY datetime(updated_at) DESC, lesson_id DESC`
    ).all();
    return rows.map(mapRow2).map(({ createdAt, closedAt, ...summary }) => summary);
  },
  upsertLesson(input) {
    db.prepare(
      `INSERT INTO lessons (
        lesson_id,
        prompt,
        status,
        latest_binding_id,
        latest_run_id,
        latest_binding_status,
        last_error_message,
        created_at,
        updated_at,
        closed_at,
        artifact_catchup_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lesson_id) DO UPDATE SET
        prompt = excluded.prompt,
        status = excluded.status,
        latest_binding_id = excluded.latest_binding_id,
        latest_run_id = excluded.latest_run_id,
        latest_binding_status = excluded.latest_binding_status,
        last_error_message = excluded.last_error_message,
        updated_at = excluded.updated_at,
        closed_at = excluded.closed_at,
        artifact_catchup_completed_at = COALESCE(excluded.artifact_catchup_completed_at, lessons.artifact_catchup_completed_at)`
    ).run(
      input.lessonId,
      input.prompt,
      input.status,
      input.latestBindingId ?? null,
      input.latestRunId ?? null,
      input.latestBindingStatus ?? null,
      input.lastErrorMessage ?? null,
      input.updatedAt,
      input.updatedAt,
      input.closedAt ?? null,
      input.artifactCatchupCompletedAt ?? null
    );
  },
  attachBinding(input) {
    db.prepare(
      `UPDATE lessons
          SET latest_binding_id = ?,
              latest_run_id = ?,
              latest_binding_status = ?,
              updated_at = ?,
              artifact_catchup_completed_at = NULL
        WHERE lesson_id = ?`
    ).run(
      input.bindingId,
      input.runId,
      input.bindingStatus,
      input.updatedAt,
      input.lessonId
    );
  },
  markArtifactCatchupCompleted(lessonId, completedAt) {
    db.prepare(
      `UPDATE lessons
          SET artifact_catchup_completed_at = ?,
              updated_at = CASE
                WHEN datetime(updated_at) > datetime(?) THEN updated_at
                ELSE ?
              END
        WHERE lesson_id = ?`
    ).run(completedAt, completedAt, completedAt, lessonId);
  },
  clearArtifactCatchupCompleted(lessonId) {
    db.prepare(
      `UPDATE lessons
          SET artifact_catchup_completed_at = NULL
        WHERE lesson_id = ?`
    ).run(lessonId);
  }
});

// backend-src/services/lesson-artifact-paths.ts
var PATH_RULES = {
  "socratic-math/lesson-response.md": {
    path: "socratic-math/lesson-response.md",
    messageKind: "lesson_response",
    notificationTopic: "lesson.response_received"
  },
  "socratic-math/lesson-hint.md": {
    path: "socratic-math/lesson-hint.md",
    messageKind: "lesson_hint",
    notificationTopic: "lesson.hint_received"
  }
};
var normalizeArtifactPath = (artifactPath) => artifactPath.replace(/\\/g, "/").trim();
var basenameOf = (normalizedPath) => {
  const segments = normalizedPath.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? normalizedPath;
};
var BASENAME_RULES = Object.fromEntries(
  Object.values(PATH_RULES).map((rule) => [basenameOf(rule.path), rule])
);
var extractSocraticMathSuffix = (normalizedPath) => {
  const appFolderMarker = "/socratic-math/";
  const markerIndex = normalizedPath.lastIndexOf(appFolderMarker);
  if (markerIndex < 0) {
    return normalizedPath.startsWith("socratic-math/") ? normalizedPath : null;
  }
  return normalizedPath.slice(markerIndex + 1);
};
var resolveLessonArtifactPathRule = (artifactPath) => {
  const normalizedPath = normalizeArtifactPath(artifactPath);
  const suffixPath = extractSocraticMathSuffix(normalizedPath);
  const rule = PATH_RULES[normalizedPath] ?? (suffixPath ? PATH_RULES[suffixPath] : void 0) ?? BASENAME_RULES[basenameOf(normalizedPath)];
  if (!rule) {
    throw new Error(`Unexpected Socratic Math Teacher artifact path '${artifactPath}'.`);
  }
  return rule;
};

// backend-src/services/run-binding-correlation-service.ts
import { randomUUID } from "node:crypto";

// backend-src/repositories/pending-launch-request-repository.ts
var mapRow3 = (row) => ({
  launchRequestId: row.launch_request_id,
  lessonId: row.lesson_id,
  status: row.status,
  bindingId: row.binding_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  committedAt: row.committed_at
});
var createPendingLaunchRequestRepository = (db) => ({
  getByLaunchRequestId(launchRequestId) {
    const row = db.prepare(
      `SELECT launch_request_id, lesson_id, status, binding_id, created_at, updated_at, committed_at
           FROM pending_launch_requests
          WHERE launch_request_id = ?`
    ).get(launchRequestId);
    return row ? mapRow3(row) : null;
  },
  insertPendingLaunchRequest(input) {
    db.prepare(
      `INSERT INTO pending_launch_requests (
         launch_request_id,
         lesson_id,
         status,
         binding_id,
         created_at,
         updated_at,
         committed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.launchRequestId,
      input.lessonId,
      input.status,
      input.bindingId,
      input.createdAt,
      input.updatedAt,
      input.committedAt
    );
  },
  markCommitted(input) {
    db.prepare(
      `UPDATE pending_launch_requests
          SET status = 'COMMITTED',
              binding_id = ?,
              updated_at = ?,
              committed_at = COALESCE(committed_at, ?)
        WHERE launch_request_id = ?`
    ).run(input.bindingId, input.committedAt, input.committedAt, input.launchRequestId);
  }
});

// backend-src/services/run-binding-correlation-service.ts
var requireNonEmptyString = (value, fieldName) => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};
var requireLaunchRequestId = (binding) => requireNonEmptyString(binding.launchRequestId, "binding.launchRequestId");
var createRunBindingCorrelationService = (context) => ({
  createPendingLaunchRequest(lessonId) {
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const pendingLaunchRequest = {
      launchRequestId: `lesson-launch-request-${randomUUID()}`,
      lessonId: requireNonEmptyString(lessonId, "lessonId"),
      status: "PENDING_START",
      bindingId: null,
      createdAt,
      updatedAt: createdAt,
      committedAt: null
    };
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createPendingLaunchRequestRepository(db).insertPendingLaunchRequest(pendingLaunchRequest);
      });
    });
    return pendingLaunchRequest;
  },
  finalizeBindingForLesson(input) {
    const launchRequestId = requireLaunchRequestId(input.binding);
    const lessonId = requireNonEmptyString(input.lessonId, "lessonId");
    const committedAt = input.committedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const lessonRepository = createLessonRepository(db);
        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const lesson = lessonRepository.getById(lessonId);
        if (!lesson) {
          throw new Error(`Lesson '${lessonId}' was not found.`);
        }
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        if (pendingLaunchRequest && pendingLaunchRequest.lessonId !== lessonId) {
          throw new Error(
            `Pending launch request '${launchRequestId}' belongs to lesson '${pendingLaunchRequest.lessonId}', not '${lessonId}'.`
          );
        }
        lessonRepository.attachBinding({
          lessonId,
          bindingId: input.binding.bindingId,
          runId: input.binding.runtime.runId,
          bindingStatus: input.binding.status,
          updatedAt: committedAt
        });
        if (pendingLaunchRequest) {
          pendingLaunchRequestRepository.markCommitted({
            launchRequestId,
            bindingId: input.binding.bindingId,
            committedAt
          });
        }
      });
    });
  },
  resolveLessonIdForBinding(binding) {
    const launchRequestId = requireLaunchRequestId(binding);
    return withAppDatabase(
      context.storage.appDatabasePath,
      (db) => withTransaction(db, () => {
        const lessonRepository = createLessonRepository(db);
        const existingLesson = lessonRepository.getByBindingId(binding.bindingId);
        if (existingLesson) {
          return existingLesson.lessonId;
        }
        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        if (!pendingLaunchRequest) {
          throw new Error(
            `Socratic Math Teacher could not resolve binding '${binding.bindingId}' from launchRequestId '${launchRequestId}'.`
          );
        }
        lessonRepository.attachBinding({
          lessonId: pendingLaunchRequest.lessonId,
          bindingId: binding.bindingId,
          runId: binding.runtime.runId,
          bindingStatus: binding.status,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        pendingLaunchRequestRepository.markCommitted({
          launchRequestId,
          bindingId: binding.bindingId,
          committedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        return pendingLaunchRequest.lessonId;
      })
    );
  },
  async reconcileLaunchRequest(launchRequestId) {
    const normalizedLaunchRequestId = requireNonEmptyString(launchRequestId, "launchRequestId");
    const pendingLaunchRequest = withAppDatabase(
      context.storage.appDatabasePath,
      (db) => createPendingLaunchRequestRepository(db).getByLaunchRequestId(normalizedLaunchRequestId)
    );
    if (!pendingLaunchRequest) {
      return null;
    }
    const binding = await context.agentExecution.findByLaunchRequestId(normalizedLaunchRequestId);
    if (!binding) {
      return null;
    }
    this.finalizeBindingForLesson({
      lessonId: pendingLaunchRequest.lessonId,
      binding
    });
    return {
      lessonId: pendingLaunchRequest.lessonId,
      binding
    };
  }
});

// backend-src/services/lesson-artifact-reconciliation-service.ts
var TERMINAL_BINDING_STATUSES = /* @__PURE__ */ new Set(["TERMINATED", "FAILED", "ORPHANED"]);
var isTerminalBinding = (binding) => TERMINAL_BINDING_STATUSES.has(binding.status);
var resolveBindingRunIds = (binding) => {
  if (binding.runtime.members.length > 0) {
    return binding.runtime.members.map((member) => member.runId);
  }
  return [binding.runtime.runId];
};
var resolveProducerForRun = (binding, runId) => {
  const member = binding.runtime.members.find((candidate) => candidate.runId === runId) ?? null;
  if (!member) {
    return null;
  }
  return {
    runId,
    memberRouteKey: member.memberRouteKey,
    memberName: member.memberName,
    displayName: member.displayName,
    runtimeKind: member.runtimeKind,
    teamPath: [...member.teamPath]
  };
};
var sortArtifacts = (artifacts) => [...artifacts].sort((left, right) => {
  const updatedAtComparison = left.updatedAt.localeCompare(right.updatedAt);
  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }
  return left.createdAt.localeCompare(right.createdAt);
});
var requireRevisionText = async (context, input) => {
  const text = await context.publishedArtifacts.readRevision(input);
  if (typeof text !== "string") {
    throw new Error(
      `Socratic Math Teacher could not read published artifact revision '${input.revisionId}' for run '${input.runId}'.`
    );
  }
  return text.trim() || "Tutor response received.";
};
var createLessonArtifactReconciliationService = (context) => ({
  async handlePersistedArtifact(event) {
    await this.projectArtifactRevision({
      binding: event.binding,
      producer: event.producer,
      runId: event.runId,
      revisionId: event.revisionId,
      path: event.path,
      publishedAt: event.publishedAt
    });
  },
  async reconcilePublishedArtifacts() {
    const bindings = await context.agentExecution.list(null);
    for (const binding of bindings) {
      const lessonId = createRunBindingCorrelationService(context).resolveLessonIdForBinding(binding);
      const lesson = withAppDatabase(
        context.storage.appDatabasePath,
        (db) => createLessonRepository(db).getById(lessonId)
      );
      if (!lesson) {
        continue;
      }
      if (isTerminalBinding(binding) && lesson.artifactCatchupCompletedAt) {
        continue;
      }
      for (const runId of resolveBindingRunIds(binding)) {
        const producer = resolveProducerForRun(binding, runId);
        if (!producer) {
          continue;
        }
        const artifacts = sortArtifacts(await context.publishedArtifacts.list(runId));
        for (const artifact of artifacts) {
          await this.projectArtifactRevision({
            binding,
            producer,
            runId,
            revisionId: artifact.revisionId,
            path: artifact.path,
            publishedAt: artifact.updatedAt
          });
        }
      }
      if (isTerminalBinding(binding)) {
        withAppDatabase(context.storage.appDatabasePath, (db) => {
          createLessonRepository(db).markArtifactCatchupCompleted(lessonId, (/* @__PURE__ */ new Date()).toISOString());
        });
      }
    }
  },
  async projectArtifactRevision(input) {
    const lessonId = createRunBindingCorrelationService(context).resolveLessonIdForBinding(input.binding);
    const rule = resolveLessonArtifactPathRule(input.path);
    const body = await requireRevisionText(context, {
      runId: input.runId,
      revisionId: input.revisionId
    });
    const notification = withAppDatabase(
      context.storage.appDatabasePath,
      (db) => withTransaction(db, () => {
        const lessonRepository = createLessonRepository(db);
        const lessonMessageRepository = createLessonMessageRepository(db);
        const lesson = lessonRepository.getById(lessonId);
        if (!lesson) {
          throw new Error(`Lesson '${lessonId}' was not found during artifact projection.`);
        }
        const inserted = lessonMessageRepository.insertMessage({
          messageId: randomUUID2(),
          lessonId,
          role: "tutor",
          kind: rule.messageKind,
          body,
          createdAt: input.publishedAt,
          sourceRevisionId: input.revisionId
        });
        if (!inserted) {
          return null;
        }
        lessonRepository.clearArtifactCatchupCompleted(lessonId);
        lessonRepository.upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: lesson.status === "closed" ? "closed" : "active",
          updatedAt: input.publishedAt,
          latestBindingId: input.binding.bindingId,
          latestRunId: input.binding.runtime.runId,
          latestBindingStatus: input.binding.status,
          lastErrorMessage: null,
          closedAt: lesson.closedAt,
          artifactCatchupCompletedAt: null
        });
        return {
          topic: rule.notificationTopic,
          payload: {
            lessonId,
            bindingId: input.binding.bindingId,
            revisionId: input.revisionId,
            runId: input.runId
          }
        };
      })
    );
    if (notification) {
      await context.publishNotification(notification.topic, notification.payload);
    }
  }
});

// backend-src/event-handlers/on-artifact.ts
var onArtifact = async (event, context) => {
  await createLessonArtifactReconciliationService(context).handlePersistedArtifact(event);
};

// backend-src/repositories/processed-event-repository.ts
var createProcessedEventRepository = (db) => ({
  claimEvent(input) {
    const result = db.prepare(
      `INSERT OR IGNORE INTO processed_events (event_id, lesson_id, journal_sequence, processed_at)
       VALUES (?, ?, ?, ?)`
    ).run(input.eventId, input.lessonId, input.journalSequence, input.processedAt);
    return result.changes > 0;
  }
});

// backend-src/services/lesson-projection-service.ts
var resolveStatus = (family, currentStatus) => {
  if (currentStatus === "closed") {
    return "closed";
  }
  if (family === "RUN_FAILED" || family === "RUN_ORPHANED") {
    return "blocked";
  }
  if (family === "RUN_TERMINATED") {
    return "closed";
  }
  return "active";
};
var projectLessonExecutionEvent = async (envelope, context) => {
  const event = envelope.event;
  const lessonId = createRunBindingCorrelationService(context).resolveLessonIdForBinding(event.binding);
  withAppDatabase(
    context.storage.appDatabasePath,
    (db) => withTransaction(db, () => {
      const lessonRepository = createLessonRepository(db);
      const processedEventRepository = createProcessedEventRepository(db);
      if (!processedEventRepository.claimEvent({
        eventId: event.eventId,
        lessonId,
        journalSequence: event.journalSequence,
        processedAt: event.publishedAt
      })) {
        return;
      }
      const lesson = lessonRepository.getById(lessonId);
      if (!lesson) {
        throw new Error(`Lesson '${lessonId}' was not found during projection.`);
      }
      lessonRepository.upsertLesson({
        lessonId,
        prompt: lesson.prompt,
        status: resolveStatus(event.family, lesson.status),
        updatedAt: event.publishedAt,
        latestBindingId: event.binding.bindingId,
        latestRunId: event.binding.runtime.runId,
        latestBindingStatus: event.binding.status,
        lastErrorMessage: event.binding.lastErrorMessage ?? null,
        closedAt: event.family === "RUN_TERMINATED" ? lesson.closedAt ?? event.publishedAt : lesson.closedAt,
        artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null
      });
    })
  );
};

// backend-src/event-handlers/on-run-failed.ts
var onRunFailed = async (event, context) => {
  await projectLessonExecutionEvent(event, context);
};

// backend-src/event-handlers/on-run-orphaned.ts
var onRunOrphaned = async (event, context) => {
  await projectLessonExecutionEvent(event, context);
};

// backend-src/event-handlers/on-run-started.ts
var onRunStarted = async (event, context) => {
  await projectLessonExecutionEvent(event, context);
};

// backend-src/event-handlers/on-run-terminated.ts
var onRunTerminated = async (event, context) => {
  await projectLessonExecutionEvent(event, context);
};

// backend-src/domain/lesson-model.ts
var UNUSABLE_BINDING_STATUSES = /* @__PURE__ */ new Set(["TERMINATING", "TERMINATED", "FAILED", "ORPHANED"]);
var isApplicationAgentTeamBinding = (binding) => binding.runtime.subject === "TEAM_RUN";
var deriveTutorTargetAddress = (lesson, binding) => {
  if (lesson.status !== "active" || !lesson.latestBindingId || lesson.latestBindingStatus && UNUSABLE_BINDING_STATUSES.has(lesson.latestBindingStatus) || !binding || binding.status !== "ATTACHED") {
    return null;
  }
  if (!isApplicationAgentTeamBinding(binding)) {
    throw new Error("Socratic tutor binding must be an agent-team binding.");
  }
  return createApplicationAgentTeamMemberTargetAddress(binding, "tutor");
};

// backend-src/services/lesson-read-service.ts
var requireLessonId = (lessonId) => {
  const normalized = lessonId.trim();
  if (!normalized) {
    throw new Error("lessonId is required.");
  }
  return normalized;
};
var createLessonReadService = (context) => ({
  listLessons() {
    return withAppDatabase(
      context.storage.appDatabasePath,
      (db) => createLessonRepository(db).listSummaries()
    );
  },
  async getLesson(lessonId) {
    const normalizedLessonId = requireLessonId(lessonId);
    const lessonDetail = withAppDatabase(context.storage.appDatabasePath, (db) => {
      const lesson = createLessonRepository(db).getById(normalizedLessonId);
      if (!lesson) {
        return null;
      }
      return {
        lesson,
        messages: createLessonMessageRepository(db).listByLessonId(normalizedLessonId)
      };
    });
    if (!lessonDetail) return null;
    const binding = lessonDetail.lesson.status === "active" && lessonDetail.lesson.latestBindingId ? await context.agentExecution.get(lessonDetail.lesson.latestBindingId) : null;
    return {
      ...lessonDetail.lesson,
      tutorTargetAddress: deriveTutorTargetAddress(lessonDetail.lesson, binding),
      messages: lessonDetail.messages
    };
  }
});

// backend-src/services/lesson-runtime-service.ts
import { randomUUID as randomUUID3 } from "node:crypto";
var LESSON_TUTOR_TEAM_SLOT_KEY = "lessonTutorTeam";
var requireNonEmptyString2 = (value, fieldName) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};
var requireLesson = (context, lessonId) => withAppDatabase(context.storage.appDatabasePath, (db) => {
  const lesson = createLessonRepository(db).getById(lessonId);
  if (!lesson) {
    throw new Error(`Lesson '${lessonId}' was not found.`);
  }
  return lesson;
});
var ensureOpenBinding = (lesson) => {
  if (!lesson.latestBindingId) {
    throw new Error(`Lesson '${lesson.lessonId}' does not have an active runtime binding.`);
  }
  if (lesson.latestBindingStatus && ["TERMINATED", "FAILED", "ORPHANED"].includes(lesson.latestBindingStatus)) {
    throw new Error(`Lesson '${lesson.lessonId}' is not attached to a live runtime binding.`);
  }
  return lesson.latestBindingId;
};
var resolveStartLessonProjection = (input) => {
  const currentBindingProjection = input.currentLesson?.latestBindingId === input.binding.bindingId ? input.currentLesson : null;
  return {
    status: currentBindingProjection?.status ?? "active",
    updatedAt: currentBindingProjection?.updatedAt ?? input.createdAt,
    latestBindingStatus: currentBindingProjection?.latestBindingStatus ?? input.binding.status,
    lastErrorMessage: currentBindingProjection?.lastErrorMessage ?? null,
    closedAt: currentBindingProjection?.closedAt ?? null,
    artifactCatchupCompletedAt: null
  };
};
var createLessonRuntimeService = (context) => ({
  async startLesson(input) {
    const prompt = requireNonEmptyString2(input.prompt, "prompt");
    const lessonId = `lesson-${randomUUID3()}`;
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const correlationService = createRunBindingCorrelationService(context);
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt,
          status: "active",
          updatedAt: createdAt,
          latestBindingId: null,
          latestRunId: null,
          latestBindingStatus: null,
          lastErrorMessage: null,
          closedAt: null,
          artifactCatchupCompletedAt: null
        });
        createLessonMessageRepository(db).insertMessage({
          messageId: randomUUID3(),
          lessonId,
          role: "student",
          kind: "prompt",
          body: prompt,
          createdAt
        });
      });
    });
    const pendingLaunchRequest = correlationService.createPendingLaunchRequest(lessonId);
    const tutorTeam = await context.agentResources.requireRunnable(LESSON_TUTOR_TEAM_SLOT_KEY);
    try {
      const binding = await context.agentExecution.startAgentTeam({
        launchRequestId: pendingLaunchRequest.launchRequestId,
        executionResourceRef: tutorTeam.executionResourceRef,
        launch: buildEffectiveTeamRunLaunch({
          configuration: tutorTeam
        })
      });
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          const lessonRepository = createLessonRepository(db);
          createPendingLaunchRequestRepository(db).markCommitted({
            launchRequestId: binding.launchRequestId,
            bindingId: binding.bindingId,
            committedAt: createdAt
          });
          const launchProjection = resolveStartLessonProjection({
            currentLesson: lessonRepository.getById(lessonId),
            binding,
            createdAt
          });
          lessonRepository.upsertLesson({
            lessonId,
            prompt,
            status: launchProjection.status,
            updatedAt: launchProjection.updatedAt,
            latestBindingId: binding.bindingId,
            latestRunId: binding.runtime.runId,
            latestBindingStatus: launchProjection.latestBindingStatus,
            lastErrorMessage: launchProjection.lastErrorMessage,
            closedAt: launchProjection.closedAt,
            artifactCatchupCompletedAt: launchProjection.artifactCatchupCompletedAt
          });
        });
      });
      await context.publishNotification("lesson.started", {
        lessonId,
        bindingId: binding.bindingId,
        runId: binding.runtime.runId,
        createdAt
      });
      return createLessonReadService(context).getLesson(lessonId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reconciled = await correlationService.reconcileLaunchRequest(pendingLaunchRequest.launchRequestId);
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createLessonRepository(db).upsertLesson({
            lessonId,
            prompt,
            status: "blocked",
            updatedAt: createdAt,
            latestBindingId: reconciled?.binding.bindingId ?? null,
            latestRunId: reconciled?.binding.runtime.runId ?? null,
            latestBindingStatus: reconciled?.binding.status ?? "FAILED",
            lastErrorMessage: message,
            closedAt: null,
            artifactCatchupCompletedAt: null
          });
        });
      });
      throw error;
    }
  },
  async askFollowUp(input) {
    const lessonId = requireNonEmptyString2(input.lessonId, "lessonId");
    const text = requireNonEmptyString2(input.text, "text");
    const lesson = requireLesson(context, lessonId);
    const bindingId = ensureOpenBinding(lesson);
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonMessageRepository(db).insertMessage({
          messageId: randomUUID3(),
          lessonId,
          role: "student",
          kind: "follow_up",
          body: text,
          createdAt
        });
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: lesson.status,
          updatedAt: createdAt,
          latestBindingId: lesson.latestBindingId,
          latestRunId: lesson.latestRunId,
          latestBindingStatus: lesson.latestBindingStatus,
          lastErrorMessage: null,
          closedAt: lesson.closedAt,
          artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null
        });
      });
    });
    await context.agentExecution.sendInput({
      address: { bindingId, target: { kind: "AGENT_TEAM_RUN" } },
      input: {
        text,
        metadata: { lessonId }
      }
    });
    return createLessonReadService(context).getLesson(lessonId);
  },
  async requestHint(input) {
    const lessonId = requireNonEmptyString2(input.lessonId, "lessonId");
    const lesson = requireLesson(context, lessonId);
    const bindingId = ensureOpenBinding(lesson);
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const detail = typeof input.text === "string" && input.text.trim() ? input.text.trim() : "Please give the student the next helpful hint without solving the full problem.";
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonMessageRepository(db).insertMessage({
          messageId: randomUUID3(),
          lessonId,
          role: "student",
          kind: "hint_request",
          body: detail,
          createdAt
        });
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: lesson.status,
          updatedAt: createdAt,
          latestBindingId: lesson.latestBindingId,
          latestRunId: lesson.latestRunId,
          latestBindingStatus: lesson.latestBindingStatus,
          lastErrorMessage: null,
          closedAt: lesson.closedAt,
          artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null
        });
      });
    });
    await context.agentExecution.sendInput({
      address: { bindingId, target: { kind: "AGENT_TEAM_RUN" } },
      input: {
        text: `The student requests a hint. ${detail}`,
        metadata: { lessonId, requestKind: "hint" }
      }
    });
    return createLessonReadService(context).getLesson(lessonId);
  },
  async closeLesson(input) {
    const lessonId = requireNonEmptyString2(input.lessonId, "lessonId");
    const lesson = requireLesson(context, lessonId);
    const closedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (lesson.latestBindingId && !(lesson.latestBindingStatus && ["TERMINATED", "FAILED", "ORPHANED"].includes(lesson.latestBindingStatus))) {
      await context.agentExecution.terminate(lesson.latestBindingId);
    }
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createLessonRepository(db).upsertLesson({
          lessonId,
          prompt: lesson.prompt,
          status: "closed",
          updatedAt: closedAt,
          latestBindingId: lesson.latestBindingId,
          latestRunId: lesson.latestRunId,
          latestBindingStatus: lesson.latestBindingStatus,
          lastErrorMessage: null,
          closedAt,
          artifactCatchupCompletedAt: lesson.artifactCatchupCompletedAt ?? null
        });
      });
    });
    await context.publishNotification("lesson.closed", {
      lessonId,
      closedAt
    });
    return createLessonReadService(context).getLesson(lessonId);
  }
});

// backend-src/graphql/index.ts
var parseOperationKey = (request) => {
  if (typeof request.operationName === "string" && request.operationName.trim()) {
    return request.operationName.trim();
  }
  const namedOperationMatch = request.query.match(/\b(?:query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)\b/i);
  if (namedOperationMatch?.[1]?.trim()) {
    return namedOperationMatch[1].trim();
  }
  const rootFieldMatch = request.query.match(/{\s*(?:[_A-Za-z][_0-9A-Za-z]*\s*:\s*)?([_A-Za-z][_0-9A-Za-z]*)/s);
  return rootFieldMatch?.[1]?.trim() || "";
};
var requireObject = (value, fieldName) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} is required.`);
  }
  return value;
};
var toGraphqlResult = async (fieldName, loader) => {
  try {
    return {
      data: {
        [fieldName]: await loader()
      }
    };
  } catch (error) {
    return {
      data: null,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }
};
var executeSocraticMathGraphql = async (request, context) => {
  const readService = createLessonReadService(context);
  const runtimeService = createLessonRuntimeService(context);
  const variables = request.variables ?? {};
  const operationKey = parseOperationKey(request);
  switch (operationKey) {
    case "LessonsQuery":
    case "lessons":
      return toGraphqlResult("lessons", () => readService.listLessons());
    case "LessonQuery":
    case "lesson":
      return toGraphqlResult("lesson", () => {
        const lessonId = typeof variables.lessonId === "string" ? variables.lessonId : "";
        return readService.getLesson(lessonId);
      });
    case "StartLessonMutation":
    case "startLesson":
      return toGraphqlResult("startLesson", () => {
        const input = requireObject(variables.input, "input");
        return runtimeService.startLesson({
          prompt: typeof input.prompt === "string" ? input.prompt : ""
        });
      });
    case "AskFollowUpMutation":
    case "askFollowUp":
      return toGraphqlResult("askFollowUp", () => {
        const input = requireObject(variables.input, "input");
        return runtimeService.askFollowUp({
          lessonId: typeof input.lessonId === "string" ? input.lessonId : "",
          text: typeof input.text === "string" ? input.text : ""
        });
      });
    case "RequestHintMutation":
    case "requestHint":
      return toGraphqlResult("requestHint", () => {
        const input = requireObject(variables.input, "input");
        return runtimeService.requestHint({
          lessonId: typeof input.lessonId === "string" ? input.lessonId : "",
          text: typeof input.text === "string" ? input.text : null
        });
      });
    case "CloseLessonMutation":
    case "closeLesson":
      return toGraphqlResult("closeLesson", () => {
        const input = requireObject(variables.input, "input");
        return runtimeService.closeLesson({
          lessonId: typeof input.lessonId === "string" ? input.lessonId : ""
        });
      });
    default:
      return {
        data: null,
        errors: [
          {
            message: `Unsupported Socratic Math Teacher GraphQL operation '${operationKey || "unknown"}'.`
          }
        ]
      };
  }
};

// backend-src/index.ts
var index_default = defineApplication({
  definitionContractVersion: "4",
  lifecycle: {
    onStart: async (context) => {
      await createLessonArtifactReconciliationService(context).reconcilePublishedArtifacts();
    }
  },
  graphql: {
    execute: executeSocraticMathGraphql
  },
  eventHandlers: {
    runStarted: onRunStarted,
    runTerminated: onRunTerminated,
    runFailed: onRunFailed,
    runOrphaned: onRunOrphaned
  },
  artifactHandlers: {
    persisted: onArtifact
  }
});
export {
  index_default as default
};
