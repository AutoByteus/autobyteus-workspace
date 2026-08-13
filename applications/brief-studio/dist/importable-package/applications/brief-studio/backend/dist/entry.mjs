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

// ../../autobyteus-application-backend-sdk/dist/index.js
var defineApplication = (definition) => definition;

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

// backend-src/repositories/artifact-repository.ts
var mapRow = (row) => ({
  briefId: row.brief_id,
  artifactKind: row.artifact_kind,
  publicationKind: row.publication_kind,
  revisionId: row.revision_id,
  path: row.path,
  description: row.description,
  body: row.body,
  producerMemberRouteKey: row.producer_member_route_key,
  updatedAt: row.updated_at
});
var createArtifactRepository = (db) => ({
  upsertArtifact(input) {
    db.prepare(
      `INSERT INTO brief_artifacts (
        brief_id,
        artifact_kind,
        publication_kind,
        revision_id,
        path,
        description,
        body,
        producer_member_route_key,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(brief_id, artifact_kind) DO UPDATE SET
        publication_kind = excluded.publication_kind,
        revision_id = excluded.revision_id,
        path = excluded.path,
        description = excluded.description,
        body = excluded.body,
        producer_member_route_key = excluded.producer_member_route_key,
        updated_at = excluded.updated_at`
    ).run(
      input.briefId,
      input.artifactKind,
      input.publicationKind,
      input.revisionId,
      input.path,
      input.description,
      input.body,
      input.producerMemberRouteKey,
      input.updatedAt
    );
  },
  listByBriefId(briefId) {
    const rows = db.prepare(
      `SELECT brief_id, artifact_kind, publication_kind, revision_id, path, description, body, producer_member_route_key, updated_at
           FROM brief_artifacts
          WHERE brief_id = ?
          ORDER BY CASE artifact_kind WHEN 'researcher' THEN 1 ELSE 2 END`
    ).all(briefId);
    return rows.map(mapRow);
  }
});

// backend-src/repositories/brief-artifact-revision-repository.ts
var createBriefArtifactRevisionRepository = (db) => ({
  claimRevision(input) {
    const result = db.prepare(
      `INSERT OR IGNORE INTO brief_artifact_revisions (
        revision_id,
        brief_id,
        binding_id,
        run_id,
        artifact_kind,
        publication_kind,
        path,
        producer_member_route_key,
        published_at,
        projected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.revisionId,
      input.briefId,
      input.bindingId,
      input.runId,
      input.artifactKind,
      input.publicationKind,
      input.path,
      input.producerMemberRouteKey,
      input.publishedAt,
      input.projectedAt
    );
    return Number(result.changes ?? 0) > 0;
  }
});

// backend-src/repositories/brief-binding-repository.ts
var mapRow2 = (row) => ({
  briefId: row.brief_id,
  bindingId: row.binding_id,
  launchRequestId: row.launch_request_id,
  runId: row.run_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  artifactCatchupCompletedAt: row.artifact_catchup_completed_at
});
var createBriefBindingRepository = (db) => ({
  getByBindingId(bindingId) {
    const row = db.prepare(
      `SELECT brief_id, binding_id, launch_request_id, run_id, created_at, updated_at, artifact_catchup_completed_at
           FROM brief_bindings
          WHERE binding_id = ?`
    ).get(bindingId);
    return row ? mapRow2(row) : null;
  },
  listByBriefId(briefId) {
    const rows = db.prepare(
      `SELECT brief_id, binding_id, launch_request_id, run_id, created_at, updated_at, artifact_catchup_completed_at
           FROM brief_bindings
          WHERE brief_id = ?
          ORDER BY datetime(created_at) DESC, binding_id DESC`
    ).all(briefId);
    return rows.map(mapRow2);
  },
  upsertBinding(input) {
    db.prepare(
      `INSERT INTO brief_bindings (
         brief_id,
         binding_id,
         launch_request_id,
         run_id,
         created_at,
         updated_at,
         artifact_catchup_completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(binding_id) DO UPDATE SET
         brief_id = excluded.brief_id,
         launch_request_id = excluded.launch_request_id,
         run_id = excluded.run_id,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         artifact_catchup_completed_at = COALESCE(excluded.artifact_catchup_completed_at, brief_bindings.artifact_catchup_completed_at)`
    ).run(
      input.briefId,
      input.bindingId,
      input.launchRequestId,
      input.runId,
      input.createdAt,
      input.updatedAt,
      input.artifactCatchupCompletedAt
    );
  },
  markArtifactCatchupCompleted(bindingId, completedAt) {
    db.prepare(
      `UPDATE brief_bindings
          SET artifact_catchup_completed_at = ?,
              updated_at = CASE
                WHEN datetime(updated_at) > datetime(?) THEN updated_at
                ELSE ?
              END
        WHERE binding_id = ?`
    ).run(completedAt, completedAt, completedAt, bindingId);
  },
  clearArtifactCatchupCompleted(bindingId) {
    db.prepare(
      `UPDATE brief_bindings
          SET artifact_catchup_completed_at = NULL
        WHERE binding_id = ?`
    ).run(bindingId);
  }
});

// backend-src/repositories/brief-repository.ts
var mapRow3 = (row) => ({
  briefId: row.brief_id,
  title: row.title,
  status: row.status,
  latestBindingId: row.latest_binding_id,
  latestRunId: row.latest_run_id,
  latestBindingStatus: row.latest_binding_status,
  lastErrorMessage: row.last_error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  approvedAt: row.approved_at,
  rejectedAt: row.rejected_at
});
var createBriefRepository = (db) => ({
  getById(briefId) {
    const row = db.prepare(
      `SELECT brief_id, title, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         WHERE brief_id = ?`
    ).get(briefId);
    return row ? mapRow3(row) : null;
  },
  listSummaries() {
    const rows = db.prepare(
      `SELECT brief_id, title, status, latest_binding_id, latest_run_id, latest_binding_status, last_error_message, created_at, updated_at, approved_at, rejected_at
         FROM briefs
         ORDER BY datetime(updated_at) DESC, brief_id DESC`
    ).all();
    return rows.map(mapRow3).map(({ createdAt, approvedAt, rejectedAt, ...summary }) => summary);
  },
  upsertProjectedBrief(input) {
    db.prepare(
      `INSERT INTO briefs (
        brief_id,
        title,
        status,
        latest_binding_id,
        latest_run_id,
        latest_binding_status,
        last_error_message,
        created_at,
        updated_at,
        approved_at,
        rejected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT(brief_id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        latest_binding_id = excluded.latest_binding_id,
        latest_run_id = excluded.latest_run_id,
        latest_binding_status = excluded.latest_binding_status,
        last_error_message = excluded.last_error_message,
        updated_at = excluded.updated_at`
    ).run(
      input.briefId,
      input.title,
      input.status,
      input.latestBindingId ?? null,
      input.latestRunId ?? null,
      input.latestBindingStatus ?? null,
      input.lastErrorMessage ?? null,
      input.updatedAt,
      input.updatedAt
    );
  },
  setStatus(input) {
    db.prepare(
      `UPDATE briefs
       SET status = ?,
           updated_at = ?,
           approved_at = ?,
           rejected_at = ?,
           last_error_message = NULL
       WHERE brief_id = ?`
    ).run(
      input.status,
      input.updatedAt,
      input.approvedAt ?? null,
      input.rejectedAt ?? null,
      input.briefId
    );
  }
});

// backend-src/services/brief-artifact-paths.ts
var preserveTerminalStatus = (nextStatus, currentStatus) => {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return currentStatus;
  }
  return nextStatus;
};
var buildRule = (input) => ({
  artifactKind: input.artifactKind,
  publicationKind: input.publicationKind,
  path: input.path,
  readyForReview: input.readyForReview,
  resolveStatus: (currentStatus) => preserveTerminalStatus(input.nextStatus, currentStatus)
});
var RULES_BY_PRODUCER = {
  researcher: {
    "brief-studio/research.md": buildRule({
      artifactKind: "researcher",
      publicationKind: "research",
      path: "brief-studio/research.md",
      readyForReview: false,
      nextStatus: "researching"
    }),
    "brief-studio/research-blocker.md": buildRule({
      artifactKind: "researcher",
      publicationKind: "research_blocker",
      path: "brief-studio/research-blocker.md",
      readyForReview: false,
      nextStatus: "blocked"
    })
  },
  writer: {
    "brief-studio/brief-draft.md": buildRule({
      artifactKind: "writer",
      publicationKind: "draft",
      path: "brief-studio/brief-draft.md",
      readyForReview: false,
      nextStatus: "draft_ready"
    }),
    "brief-studio/final-brief.md": buildRule({
      artifactKind: "writer",
      publicationKind: "final",
      path: "brief-studio/final-brief.md",
      readyForReview: true,
      nextStatus: "in_review"
    }),
    "brief-studio/brief-blocker.md": buildRule({
      artifactKind: "writer",
      publicationKind: "writer_blocker",
      path: "brief-studio/brief-blocker.md",
      readyForReview: false,
      nextStatus: "blocked"
    })
  }
};
var normalizeArtifactPath = (artifactPath) => artifactPath.replace(/\\/g, "/").trim();
var basenameOf = (normalizedPath) => {
  const segments = normalizedPath.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? normalizedPath;
};
var buildBasenameRules = (rulesByPath) => {
  const entriesByBasename = /* @__PURE__ */ new Map();
  for (const rule of Object.values(rulesByPath)) {
    const basename = basenameOf(rule.path);
    entriesByBasename.set(
      basename,
      entriesByBasename.has(basename) ? null : rule
    );
  }
  return Object.fromEntries(
    [...entriesByBasename.entries()].filter((entry) => entry[1] !== null)
  );
};
var BASENAME_RULES_BY_PRODUCER = Object.fromEntries(
  Object.entries(RULES_BY_PRODUCER).map(([producer, rules]) => [
    producer,
    buildBasenameRules(rules)
  ])
);
var extractBriefStudioSuffix = (normalizedPath) => {
  const appFolderMarker = "/brief-studio/";
  const markerIndex = normalizedPath.lastIndexOf(appFolderMarker);
  if (markerIndex < 0) {
    return normalizedPath.startsWith("brief-studio/") ? normalizedPath : null;
  }
  return normalizedPath.slice(markerIndex + 1);
};
var findBriefArtifactPathRule = (memberRouteKey, artifactPath) => {
  const normalizedRouteKey = memberRouteKey.trim();
  const normalizedPath = normalizeArtifactPath(artifactPath);
  const producerRules = RULES_BY_PRODUCER[normalizedRouteKey];
  if (!producerRules) {
    return null;
  }
  const suffixPath = extractBriefStudioSuffix(normalizedPath);
  return producerRules[normalizedPath] ?? (suffixPath ? producerRules[suffixPath] : void 0) ?? BASENAME_RULES_BY_PRODUCER[normalizedRouteKey]?.[basenameOf(normalizedPath)] ?? null;
};
var resolveBriefArtifactPathRule = (memberRouteKey, artifactPath) => {
  const normalizedRouteKey = memberRouteKey.trim();
  const producerRules = RULES_BY_PRODUCER[normalizedRouteKey];
  if (!producerRules) {
    throw new Error(
      `Unexpected Brief Studio artifact producer '${memberRouteKey}'. Expected 'researcher' or 'writer'.`
    );
  }
  const rule = findBriefArtifactPathRule(normalizedRouteKey, artifactPath);
  if (!rule) {
    throw new Error(
      `Unexpected Brief Studio artifact path '${artifactPath}' for producer '${memberRouteKey}'.`
    );
  }
  return rule;
};

// backend-src/services/run-binding-correlation-service.ts
import { randomUUID } from "node:crypto";

// backend-src/repositories/pending-launch-request-repository.ts
var mapRow4 = (row) => ({
  launchRequestId: row.launch_request_id,
  briefId: row.brief_id,
  status: row.status,
  bindingId: row.binding_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  committedAt: row.committed_at
});
var createPendingLaunchRequestRepository = (db) => ({
  getByLaunchRequestId(launchRequestId) {
    const row = db.prepare(
      `SELECT launch_request_id, brief_id, status, binding_id, created_at, updated_at, committed_at
           FROM pending_launch_requests
          WHERE launch_request_id = ?`
    ).get(launchRequestId);
    return row ? mapRow4(row) : null;
  },
  insertPendingLaunchRequest(input) {
    db.prepare(
      `INSERT INTO pending_launch_requests (
         launch_request_id,
         brief_id,
         status,
         binding_id,
         created_at,
         updated_at,
         committed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.launchRequestId,
      input.briefId,
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
var toBindingRecord = (briefId, binding, updatedAt) => ({
  briefId,
  bindingId: binding.bindingId,
  launchRequestId: binding.launchRequestId,
  runId: binding.runtime.runId,
  createdAt: binding.createdAt,
  updatedAt,
  artifactCatchupCompletedAt: null
});
var ensureBindingConsistency = (pendingLaunchRequest, existingBinding, input) => {
  if (pendingLaunchRequest && pendingLaunchRequest.briefId !== input.briefId) {
    throw new Error(
      `Pending launch request '${input.binding.launchRequestId}' belongs to brief '${pendingLaunchRequest.briefId}', not '${input.briefId}'.`
    );
  }
  if (pendingLaunchRequest?.bindingId && pendingLaunchRequest.bindingId !== input.binding.bindingId) {
    throw new Error(
      `Pending launch request '${input.binding.launchRequestId}' is already attached to binding '${pendingLaunchRequest.bindingId}'.`
    );
  }
  if (existingBinding && existingBinding.briefId !== input.briefId) {
    throw new Error(
      `Binding '${input.binding.bindingId}' is already attached to brief '${existingBinding.briefId}'.`
    );
  }
};
var requireLaunchRequestId = (binding) => requireNonEmptyString(binding.launchRequestId, "binding.launchRequestId");
var createRunBindingCorrelationService = (context) => ({
  createPendingLaunchRequest(briefId) {
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const pendingLaunchRequest = {
      launchRequestId: `brief-launch-request-${randomUUID()}`,
      briefId: requireNonEmptyString(briefId, "briefId"),
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
  finalizeBindingForBrief(input) {
    const launchRequestId = requireLaunchRequestId(input.binding);
    const briefId = requireNonEmptyString(input.briefId, "briefId");
    const committedAt = input.committedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const briefBindingRepository = createBriefBindingRepository(db);
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        const existingBinding = briefBindingRepository.getByBindingId(input.binding.bindingId);
        ensureBindingConsistency(pendingLaunchRequest, existingBinding, { briefId, binding: input.binding });
        briefBindingRepository.upsertBinding({
          ...toBindingRecord(briefId, input.binding, committedAt),
          artifactCatchupCompletedAt: existingBinding?.artifactCatchupCompletedAt ?? null
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
  resolveBriefIdForBinding(binding) {
    const launchRequestId = requireLaunchRequestId(binding);
    return withAppDatabase(
      context.storage.appDatabasePath,
      (db) => withTransaction(db, () => {
        const briefBindingRepository = createBriefBindingRepository(db);
        const existingBinding = briefBindingRepository.getByBindingId(binding.bindingId);
        if (existingBinding) {
          return existingBinding.briefId;
        }
        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        if (!pendingLaunchRequest) {
          throw new Error(
            `Brief Studio could not resolve binding '${binding.bindingId}' from launchRequestId '${launchRequestId}'.`
          );
        }
        const committedAt = (/* @__PURE__ */ new Date()).toISOString();
        briefBindingRepository.upsertBinding(toBindingRecord(pendingLaunchRequest.briefId, binding, committedAt));
        pendingLaunchRequestRepository.markCommitted({
          launchRequestId,
          bindingId: binding.bindingId,
          committedAt
        });
        return pendingLaunchRequest.briefId;
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
    this.finalizeBindingForBrief({
      briefId: pendingLaunchRequest.briefId,
      binding
    });
    return {
      briefId: pendingLaunchRequest.briefId,
      binding
    };
  },
  listBindingIdsByBriefId(briefId) {
    const normalizedBriefId = requireNonEmptyString(briefId, "briefId");
    return withAppDatabase(
      context.storage.appDatabasePath,
      (db) => createBriefBindingRepository(db).listByBriefId(normalizedBriefId).map((binding) => binding.bindingId)
    );
  }
});

// backend-src/services/brief-artifact-reconciliation-service.ts
var TERMINAL_BINDING_STATUSES = /* @__PURE__ */ new Set(["TERMINATED", "FAILED", "ORPHANED"]);
var isTerminalBinding = (binding) => TERMINAL_BINDING_STATUSES.has(binding.status);
var resolveBindingRunIds = (binding) => {
  if (binding.runtime.members.length > 0) {
    return binding.runtime.members.map((member) => member.runId);
  }
  return [binding.runtime.runId];
};
var sortArtifacts = (artifacts) => [...artifacts].sort((left, right) => {
  const updatedAtComparison = left.updatedAt.localeCompare(right.updatedAt);
  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }
  return left.createdAt.localeCompare(right.createdAt);
});
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
var requireRevisionText = async (context, input) => {
  const text = await context.publishedArtifacts.readRevision(input);
  if (typeof text !== "string") {
    throw new Error(
      `Brief Studio could not read published artifact revision '${input.revisionId}' for run '${input.runId}'.`
    );
  }
  return text;
};
var buildReadyNotificationPayload = (input) => ({
  topic: "brief.ready_for_review",
  payload: {
    briefId: input.briefId,
    bindingId: input.bindingId,
    revisionId: input.revisionId,
    runId: input.runId
  }
});
var createBriefArtifactReconciliationService = (context) => ({
  async handlePersistedArtifact(event) {
    await this.projectArtifactRevision({
      binding: event.binding,
      producer: event.producer,
      runId: event.runId,
      revisionId: event.revisionId,
      path: event.path,
      description: event.description,
      publishedAt: event.publishedAt
    });
  },
  async reconcilePublishedArtifacts() {
    const bindings = await context.agentExecution.list(null);
    for (const binding of bindings) {
      const correlationService = createRunBindingCorrelationService(context);
      correlationService.resolveBriefIdForBinding(binding);
      const bindingRecord = withAppDatabase(
        context.storage.appDatabasePath,
        (db) => createBriefBindingRepository(db).getByBindingId(binding.bindingId)
      );
      if (isTerminalBinding(binding) && bindingRecord?.artifactCatchupCompletedAt) {
        continue;
      }
      const runIds = resolveBindingRunIds(binding);
      for (const runId of runIds) {
        const producer = resolveProducerForRun(binding, runId);
        if (!producer) {
          continue;
        }
        const publishedArtifacts = sortArtifacts(
          await context.publishedArtifacts.list(runId)
        );
        for (const artifact of publishedArtifacts) {
          if (!findBriefArtifactPathRule(producer.memberRouteKey, artifact.path)) {
            continue;
          }
          await this.projectArtifactRevision({
            binding,
            producer,
            runId,
            revisionId: artifact.revisionId,
            path: artifact.path,
            description: artifact.description,
            publishedAt: artifact.updatedAt
          });
        }
      }
      if (isTerminalBinding(binding)) {
        withAppDatabase(context.storage.appDatabasePath, (db) => {
          createBriefBindingRepository(db).markArtifactCatchupCompleted(
            binding.bindingId,
            (/* @__PURE__ */ new Date()).toISOString()
          );
        });
      }
    }
  },
  async projectArtifactRevision(input) {
    if (!input.producer?.memberRouteKey) {
      throw new Error("Brief Studio artifact projection requires producer.memberRouteKey.");
    }
    const producer = input.producer;
    const briefId = createRunBindingCorrelationService(context).resolveBriefIdForBinding(input.binding);
    const pathRule = resolveBriefArtifactPathRule(producer.memberRouteKey, input.path);
    const body = await requireRevisionText(context, {
      runId: input.runId,
      revisionId: input.revisionId
    });
    const projectedAt = (/* @__PURE__ */ new Date()).toISOString();
    const readyNotification = withAppDatabase(
      context.storage.appDatabasePath,
      (db) => withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        const artifactRepository = createArtifactRepository(db);
        const bindingRepository = createBriefBindingRepository(db);
        const revisionRepository = createBriefArtifactRevisionRepository(db);
        const brief = briefRepository.getById(briefId);
        if (!brief) {
          throw new Error(`Brief '${briefId}' was not found during artifact projection.`);
        }
        if (!revisionRepository.claimRevision({
          revisionId: input.revisionId,
          briefId,
          bindingId: input.binding.bindingId,
          runId: input.runId,
          artifactKind: pathRule.artifactKind,
          publicationKind: pathRule.publicationKind,
          path: input.path,
          producerMemberRouteKey: producer.memberRouteKey,
          publishedAt: input.publishedAt,
          projectedAt
        })) {
          return null;
        }
        bindingRepository.clearArtifactCatchupCompleted(input.binding.bindingId);
        artifactRepository.upsertArtifact({
          briefId,
          artifactKind: pathRule.artifactKind,
          publicationKind: pathRule.publicationKind,
          revisionId: input.revisionId,
          path: input.path,
          description: input.description ?? null,
          body,
          producerMemberRouteKey: producer.memberRouteKey,
          updatedAt: input.publishedAt
        });
        briefRepository.upsertProjectedBrief({
          briefId,
          title: brief.title,
          status: pathRule.resolveStatus(brief.status),
          updatedAt: input.publishedAt,
          latestBindingId: input.binding.bindingId,
          latestRunId: input.binding.runtime.runId,
          latestBindingStatus: input.binding.status,
          lastErrorMessage: null
        });
        return pathRule.readyForReview ? buildReadyNotificationPayload({
          briefId,
          bindingId: input.binding.bindingId,
          revisionId: input.revisionId,
          runId: input.runId
        }) : null;
      })
    );
    if (readyNotification) {
      await context.publishNotification(readyNotification.topic, readyNotification.payload);
    }
  }
});

// backend-src/event-handlers/on-artifact.ts
var onArtifact = async (event, context) => {
  await createBriefArtifactReconciliationService(context).handlePersistedArtifact(event);
};

// backend-src/repositories/processed-event-repository.ts
var createProcessedEventRepository = (db) => ({
  claimEvent(input) {
    const result = db.prepare(
      `INSERT INTO processed_events (event_id, brief_id, journal_sequence, processed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(event_id) DO NOTHING`
    ).run(input.eventId, input.briefId, input.journalSequence, input.processedAt);
    return Number(result.changes ?? 0) > 0;
  }
});

// backend-src/services/brief-projection-service.ts
var deriveFallbackTitle = (briefId) => `Brief ${briefId.slice(0, 8)}`;
var preserveTerminalStatus2 = (nextStatus, currentStatus) => {
  if (currentStatus === "approved" || currentStatus === "rejected") {
    return currentStatus;
  }
  return nextStatus;
};
var resolveLifecycleStatus = (family, currentStatus) => {
  switch (family) {
    case "RUN_STARTED":
      return preserveTerminalStatus2(currentStatus ?? "researching", currentStatus);
    case "RUN_FAILED":
    case "RUN_ORPHANED":
      return preserveTerminalStatus2("blocked", currentStatus);
    case "RUN_TERMINATED":
      return currentStatus ?? "blocked";
    default:
      return currentStatus ?? "researching";
  }
};
var projectExecutionEvent = async (envelope, context) => {
  const event = envelope.event;
  const briefId = createRunBindingCorrelationService(context).resolveBriefIdForBinding(event.binding);
  withAppDatabase(
    context.storage.appDatabasePath,
    (db) => withTransaction(db, () => {
      const briefRepository = createBriefRepository(db);
      const processedEventRepository = createProcessedEventRepository(db);
      if (!processedEventRepository.claimEvent({
        eventId: event.eventId,
        briefId,
        journalSequence: event.journalSequence,
        processedAt: event.publishedAt
      })) {
        return;
      }
      const currentBrief = briefRepository.getById(briefId);
      briefRepository.upsertProjectedBrief({
        briefId,
        title: currentBrief?.title || deriveFallbackTitle(briefId),
        status: resolveLifecycleStatus(event.family, currentBrief?.status ?? null),
        updatedAt: event.publishedAt,
        latestBindingId: event.binding.bindingId,
        latestRunId: event.binding.runtime.runId,
        latestBindingStatus: event.binding.status,
        lastErrorMessage: event.binding.lastErrorMessage ?? null
      });
    })
  );
};

// backend-src/event-handlers/on-run-failed.ts
var onRunFailed = async (envelope, context) => {
  await projectExecutionEvent(envelope, context);
};

// backend-src/event-handlers/on-run-orphaned.ts
var onRunOrphaned = async (envelope, context) => {
  await projectExecutionEvent(envelope, context);
};

// backend-src/event-handlers/on-run-started.ts
var onRunStarted = async (envelope, context) => {
  await projectExecutionEvent(envelope, context);
};

// backend-src/event-handlers/on-run-terminated.ts
var onRunTerminated = async (envelope, context) => {
  await projectExecutionEvent(envelope, context);
};

// backend-src/repositories/review-note-repository.ts
var mapRow5 = (row) => ({
  noteId: row.note_id,
  briefId: row.brief_id,
  body: row.body,
  createdAt: row.created_at
});
var createReviewNoteRepository = (db) => ({
  insertNote(input) {
    db.prepare(
      `INSERT INTO review_notes (note_id, brief_id, body, created_at) VALUES (?, ?, ?, ?)`
    ).run(input.noteId, input.briefId, input.body, input.createdAt);
  },
  listByBriefId(briefId) {
    const rows = db.prepare(
      `SELECT note_id, brief_id, body, created_at
         FROM review_notes
         WHERE brief_id = ?
         ORDER BY datetime(created_at) DESC, note_id DESC`
    ).all(briefId);
    return rows.map(mapRow5);
  }
});

// backend-src/services/brief-read-service.ts
var requireBriefId = (briefId) => {
  const normalized = briefId.trim();
  if (!normalized) {
    throw new Error("briefId is required.");
  }
  return normalized;
};
var createBriefReadService = (context) => ({
  listBriefs() {
    return withAppDatabase(
      context.storage.appDatabasePath,
      (db) => createBriefRepository(db).listSummaries()
    );
  },
  getBrief(briefId) {
    const normalizedBriefId = requireBriefId(briefId);
    return withAppDatabase(context.storage.appDatabasePath, (db) => {
      const briefRepository = createBriefRepository(db);
      const brief = briefRepository.getById(normalizedBriefId);
      if (!brief) {
        return null;
      }
      return {
        ...brief,
        artifacts: createArtifactRepository(db).listByBriefId(normalizedBriefId),
        reviewNotes: createReviewNoteRepository(db).listByBriefId(normalizedBriefId)
      };
    });
  },
  async listBriefExecutions(briefId) {
    const normalizedBriefId = requireBriefId(briefId);
    const bindingIds = createRunBindingCorrelationService(context).listBindingIdsByBriefId(normalizedBriefId);
    const bindings = (await Promise.all(bindingIds.map((bindingId) => context.agentExecution.get(bindingId)))).filter((binding) => Boolean(binding));
    return bindings.map((binding) => ({
      bindingId: binding.bindingId,
      status: binding.status,
      runId: binding.runtime.runId,
      definitionId: binding.runtime.definitionId,
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
      terminatedAt: binding.terminatedAt,
      lastErrorMessage: binding.lastErrorMessage
    })).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
});

// backend-src/services/brief-review-service.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var requireBrief = (briefId) => {
  const normalized = typeof briefId === "string" ? briefId.trim() : "";
  if (!normalized) {
    throw new Error("briefId is required.");
  }
  return normalized;
};
var createBriefReviewService = (context) => ({
  async approveBrief(input) {
    const briefId = requireBrief(input.briefId);
    const reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        if (!briefRepository.getById(briefId)) {
          throw new Error(`Brief '${briefId}' was not found.`);
        }
        briefRepository.setStatus({
          briefId,
          status: "approved",
          updatedAt: reviewedAt,
          approvedAt: reviewedAt,
          rejectedAt: null
        });
      });
    });
    await context.publishNotification("brief.review_updated", {
      briefId,
      status: "approved",
      reviewedAt
    });
    return { briefId, status: "approved" };
  },
  async rejectBrief(input) {
    const briefId = requireBrief(input.briefId);
    const reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        const reviewNoteRepository = createReviewNoteRepository(db);
        if (!briefRepository.getById(briefId)) {
          throw new Error(`Brief '${briefId}' was not found.`);
        }
        briefRepository.setStatus({
          briefId,
          status: "rejected",
          updatedAt: reviewedAt,
          approvedAt: null,
          rejectedAt: reviewedAt
        });
        if (reason) {
          reviewNoteRepository.insertNote({
            noteId: randomUUID2(),
            briefId,
            body: reason,
            createdAt: reviewedAt
          });
        }
      });
    });
    await context.publishNotification("brief.review_updated", {
      briefId,
      status: "rejected",
      reviewedAt,
      reason: reason || null
    });
    return { briefId, status: "rejected" };
  },
  async addReviewNote(input) {
    const briefId = requireBrief(input.briefId);
    const body = typeof input.body === "string" ? input.body.trim() : "";
    if (!body) {
      throw new Error("body is required.");
    }
    const noteId = randomUUID2();
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        const reviewNoteRepository = createReviewNoteRepository(db);
        const existing = briefRepository.getById(briefId);
        if (!existing) {
          throw new Error(`Brief '${briefId}' was not found.`);
        }
        reviewNoteRepository.insertNote({
          noteId,
          briefId,
          body,
          createdAt
        });
        if (existing.status !== "approved" && existing.status !== "rejected") {
          briefRepository.setStatus({
            briefId,
            status: "in_review",
            updatedAt: createdAt,
            approvedAt: existing.approvedAt,
            rejectedAt: existing.rejectedAt
          });
        }
      });
    });
    await context.publishNotification("brief.note_added", {
      briefId,
      noteId,
      createdAt
    });
    return { briefId, noteId };
  }
});

// backend-src/services/brief-run-launch-service.ts
import { randomUUID as randomUUID3 } from "node:crypto";
var DRAFTING_TEAM_SLOT_KEY = "draftingTeam";
var requireNonEmptyString2 = (value, fieldName) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};
var buildInitialInputText = (input) => {
  const sections = [
    `Create or revise a reviewable brief titled "${input.title}".`,
    "Use the bundled researcher and writer flow, and publish artifacts as you progress.",
    `Fresh-run workflow is research-first: the researcher starts, writes the research file, publishes it with publish_artifacts using artifacts: [{ path: "<exact absolute path returned by write_file>" }] and the exact absolute path returned by the write step, and then hands off to the writer before drafting begins.`,
    "Researcher: keep the research checkpoint concise and finish the required publication + handoff flow instead of replying with plain prose. Writer: wait for the researcher handoff, review that file, write the brief, and keep the final checkpoint concise.",
    `publish_artifacts is only for publishing files after they have already been written, and single-file publication should use artifacts: [{ path: "<exact absolute path returned by write_file>" }] with the exact absolute file path returned by that write step.`
  ];
  if (input.latestWriterSummary) {
    sections.push(`Current projected writer summary: ${input.latestWriterSummary}`);
  }
  if (input.latestWriterBody) {
    sections.push(`Current projected writer body: ${input.latestWriterBody}`);
  }
  if (input.reviewNotes.length > 0) {
    sections.push(`Review notes to address:
- ${input.reviewNotes.join("\n- ")}`);
  }
  return sections.join("\n\n");
};
var resolveLaunchProjection = (input) => {
  const currentBindingProjection = input.currentBrief?.latestBindingId === input.binding.bindingId ? input.currentBrief : null;
  return {
    title: currentBindingProjection?.title ?? input.brief.title,
    status: currentBindingProjection?.status ?? (input.brief.status === "approved" || input.brief.status === "rejected" ? input.brief.status : "researching"),
    updatedAt: currentBindingProjection?.updatedAt ?? input.launchedAt,
    latestBindingStatus: currentBindingProjection?.latestBindingStatus ?? input.binding.status,
    lastErrorMessage: currentBindingProjection?.lastErrorMessage ?? null
  };
};
var createBriefRunLaunchService = (context) => ({
  async createBrief(input) {
    const title = requireNonEmptyString2(input.title, "title");
    const briefId = `brief-${randomUUID3()}`;
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const brief = withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createBriefRepository(db).upsertProjectedBrief({
          briefId,
          title,
          status: "not_started",
          updatedAt: createdAt,
          latestBindingId: null,
          latestRunId: null,
          latestBindingStatus: null,
          lastErrorMessage: null
        });
      });
      return createBriefRepository(db).getById(briefId);
    });
    if (!brief) {
      throw new Error(`Brief '${briefId}' was not created.`);
    }
    await context.publishNotification("brief.created", {
      briefId,
      createdAt
    });
    return brief;
  },
  async launchDraftRun(input) {
    const briefId = requireNonEmptyString2(input.briefId, "briefId");
    const correlationService = createRunBindingCorrelationService(context);
    const launchContext = withAppDatabase(context.storage.appDatabasePath, (db) => {
      const briefRepository = createBriefRepository(db);
      const artifactRepository = createArtifactRepository(db);
      const reviewNoteRepository = createReviewNoteRepository(db);
      const brief = briefRepository.getById(briefId);
      if (!brief) {
        throw new Error(`Brief '${briefId}' was not found.`);
      }
      const writerArtifact = artifactRepository.listByBriefId(briefId).find((artifact) => artifact.artifactKind === "writer") ?? null;
      const reviewNotes = reviewNoteRepository.listByBriefId(briefId).map((note) => note.body.trim()).filter(Boolean);
      return {
        brief,
        latestWriterSummary: writerArtifact?.description?.trim() || null,
        latestWriterBody: writerArtifact?.body?.trim() || null,
        reviewNotes
      };
    });
    const launchedAt = (/* @__PURE__ */ new Date()).toISOString();
    const pendingLaunchRequest = correlationService.createPendingLaunchRequest(briefId);
    const draftingTeam = await context.agentResources.requireRunnable(DRAFTING_TEAM_SLOT_KEY);
    try {
      const binding = await context.agentExecution.startAgentTeam({
        launchRequestId: pendingLaunchRequest.launchRequestId,
        executionResourceRef: draftingTeam.executionResourceRef,
        launch: buildEffectiveTeamRunLaunch({
          configuration: draftingTeam
        }),
        initialInput: {
          text: buildInitialInputText({
            title: launchContext.brief.title,
            latestWriterSummary: launchContext.latestWriterSummary,
            latestWriterBody: launchContext.latestWriterBody,
            reviewNotes: launchContext.reviewNotes
          }),
          metadata: {
            briefId,
            title: launchContext.brief.title
          }
        }
      });
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          const briefRepository = createBriefRepository(db);
          createPendingLaunchRequestRepository(db).markCommitted({
            launchRequestId: binding.launchRequestId,
            bindingId: binding.bindingId,
            committedAt: launchedAt
          });
          createBriefBindingRepository(db).upsertBinding({
            briefId,
            bindingId: binding.bindingId,
            launchRequestId: binding.launchRequestId,
            runId: binding.runtime.runId,
            createdAt: binding.createdAt,
            updatedAt: launchedAt,
            artifactCatchupCompletedAt: null
          });
          const launchProjection = resolveLaunchProjection({
            brief: launchContext.brief,
            currentBrief: briefRepository.getById(briefId),
            binding,
            launchedAt
          });
          briefRepository.upsertProjectedBrief({
            briefId,
            title: launchProjection.title,
            status: launchProjection.status,
            updatedAt: launchProjection.updatedAt,
            latestBindingId: binding.bindingId,
            latestRunId: binding.runtime.runId,
            latestBindingStatus: launchProjection.latestBindingStatus,
            lastErrorMessage: launchProjection.lastErrorMessage
          });
        });
      });
      await context.publishNotification("brief.draft_run_started", {
        briefId,
        bindingId: binding.bindingId,
        runId: binding.runtime.runId,
        launchedAt
      });
      return {
        briefId,
        bindingId: binding.bindingId,
        runId: binding.runtime.runId,
        status: binding.status
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reconciled = await correlationService.reconcileLaunchRequest(pendingLaunchRequest.launchRequestId);
      withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
          createBriefRepository(db).upsertProjectedBrief({
            briefId,
            title: launchContext.brief.title,
            status: launchContext.brief.status === "approved" || launchContext.brief.status === "rejected" ? launchContext.brief.status : "blocked",
            updatedAt: launchedAt,
            latestBindingId: reconciled?.binding.bindingId ?? null,
            latestRunId: reconciled?.binding.runtime.runId ?? null,
            latestBindingStatus: reconciled?.binding.status ?? "FAILED",
            lastErrorMessage: message
          });
        });
      });
      throw error;
    }
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
var executeBriefStudioGraphql = async (request, context) => {
  const readService = createBriefReadService(context);
  const reviewService = createBriefReviewService(context);
  const runLaunchService = createBriefRunLaunchService(context);
  const variables = request.variables ?? {};
  const operationKey = parseOperationKey(request);
  switch (operationKey) {
    case "BriefsQuery":
    case "briefs":
      return toGraphqlResult("briefs", () => readService.listBriefs());
    case "BriefQuery":
    case "brief":
      return toGraphqlResult("brief", () => {
        const briefId = typeof variables.briefId === "string" ? variables.briefId : "";
        return readService.getBrief(briefId);
      });
    case "BriefExecutionsQuery":
    case "briefExecutions":
      return toGraphqlResult("briefExecutions", () => {
        const briefId = typeof variables.briefId === "string" ? variables.briefId : "";
        return readService.listBriefExecutions(briefId);
      });
    case "CreateBriefMutation":
    case "createBrief":
      return toGraphqlResult("createBrief", () => {
        const input = requireObject(variables.input, "input");
        return runLaunchService.createBrief({
          title: typeof input.title === "string" ? input.title : ""
        });
      });
    case "LaunchDraftRunMutation":
    case "launchDraftRun":
      return toGraphqlResult("launchDraftRun", () => {
        const input = requireObject(variables.input, "input");
        return runLaunchService.launchDraftRun({
          briefId: typeof input.briefId === "string" ? input.briefId : ""
        });
      });
    case "ApproveBriefMutation":
    case "approveBrief":
      return toGraphqlResult("approveBrief", () => {
        const input = requireObject(variables.input, "input");
        return reviewService.approveBrief({
          briefId: typeof input.briefId === "string" ? input.briefId : ""
        });
      });
    case "RejectBriefMutation":
    case "rejectBrief":
      return toGraphqlResult("rejectBrief", () => {
        const input = requireObject(variables.input, "input");
        return reviewService.rejectBrief({
          briefId: typeof input.briefId === "string" ? input.briefId : "",
          reason: typeof input.reason === "string" ? input.reason : null
        });
      });
    case "AddReviewNoteMutation":
    case "addReviewNote":
      return toGraphqlResult("addReviewNote", () => {
        const input = requireObject(variables.input, "input");
        return reviewService.addReviewNote({
          briefId: typeof input.briefId === "string" ? input.briefId : "",
          body: typeof input.body === "string" ? input.body : ""
        });
      });
    default:
      return {
        data: null,
        errors: [
          {
            message: `Unsupported Brief Studio GraphQL operation '${operationKey || "unknown"}'.`
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
      await createBriefArtifactReconciliationService(context).reconcilePublishedArtifacts();
    }
  },
  graphql: {
    execute: executeBriefStudioGraphql
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
