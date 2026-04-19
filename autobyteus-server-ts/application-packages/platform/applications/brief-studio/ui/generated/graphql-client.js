import {
  createApplicationBackendMountTransport,
  createApplicationClient,
} from "../vendor/application-frontend-sdk.js";

const BRIEFS_QUERY = `query BriefsQuery {
  briefs {
    briefId
    title
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
  }
}`;

const BRIEF_QUERY = `query BriefQuery($briefId: ID!) {
  brief(briefId: $briefId) {
    briefId
    title
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    approvedAt
    rejectedAt
    artifacts {
      briefId
      artifactKind
      artifactKey
      artifactType
      title
      summary
      artifactRef
      metadata
      isFinal
      producerMemberRouteKey
      updatedAt
    }
    reviewNotes {
      noteId
      briefId
      body
      createdAt
    }
  }
}`;

const BRIEF_EXECUTIONS_QUERY = `query BriefExecutionsQuery($briefId: ID!) {
  briefExecutions(briefId: $briefId) {
    bindingId
    status
    runId
    definitionId
    createdAt
    updatedAt
    terminatedAt
    lastErrorMessage
  }
}`;

const CREATE_BRIEF_MUTATION = `mutation CreateBriefMutation($input: CreateBriefInput!) {
  createBrief(input: $input) {
    briefId
    title
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
  }
}`;

const LAUNCH_DRAFT_RUN_MUTATION = `mutation LaunchDraftRunMutation($input: LaunchDraftRunInput!) {
  launchDraftRun(input: $input) {
    briefId
    bindingId
    runId
    status
  }
}`;

const APPROVE_BRIEF_MUTATION = `mutation ApproveBriefMutation($input: ApproveBriefInput!) {
  approveBrief(input: $input) {
    briefId
    status
  }
}`;

const REJECT_BRIEF_MUTATION = `mutation RejectBriefMutation($input: RejectBriefInput!) {
  rejectBrief(input: $input) {
    briefId
    status
  }
}`;

const ADD_REVIEW_NOTE_MUTATION = `mutation AddReviewNoteMutation($input: AddReviewNoteInput!) {
  addReviewNote(input: $input) {
    briefId
    noteId
  }
}`;

const readGraphqlField = async (promise, fieldName) => {
  const result = await promise;
  if (Array.isArray(result?.errors) && result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message || String(error)).join("\n"));
  }
  if (!result?.data || !(fieldName in result.data)) {
    throw new Error(`Missing GraphQL field '${fieldName}'.`);
  }
  return result.data[fieldName];
};

export const createBriefStudioGraphqlClient = (bootstrap) => {
  const applicationClient = createApplicationClient({
    applicationId: bootstrap.application.applicationId,
    requestContext: bootstrap.requestContext,
    transport: createApplicationBackendMountTransport({
      backendBaseUrl: bootstrap.transport.backendBaseUrl,
      backendNotificationsUrl: bootstrap.transport.backendNotificationsUrl,
    }),
  });

  const execute = (query, operationName, variables, fieldName) =>
    readGraphqlField(
      applicationClient.graphql({ query, operationName, variables }),
      fieldName,
    );

  return {
    getApplicationInfo: applicationClient.getApplicationInfo,
    subscribeNotifications: applicationClient.subscribeNotifications,
    briefs: () => execute(BRIEFS_QUERY, "BriefsQuery", null, "briefs"),
    brief: (briefId) => execute(BRIEF_QUERY, "BriefQuery", { briefId }, "brief"),
    briefExecutions: (briefId) =>
      execute(BRIEF_EXECUTIONS_QUERY, "BriefExecutionsQuery", { briefId }, "briefExecutions"),
    createBrief: (input) =>
      execute(CREATE_BRIEF_MUTATION, "CreateBriefMutation", { input }, "createBrief"),
    launchDraftRun: (input) =>
      execute(LAUNCH_DRAFT_RUN_MUTATION, "LaunchDraftRunMutation", { input }, "launchDraftRun"),
    approveBrief: (input) =>
      execute(APPROVE_BRIEF_MUTATION, "ApproveBriefMutation", { input }, "approveBrief"),
    rejectBrief: (input) =>
      execute(REJECT_BRIEF_MUTATION, "RejectBriefMutation", { input }, "rejectBrief"),
    addReviewNote: (input) =>
      execute(ADD_REVIEW_NOTE_MUTATION, "AddReviewNoteMutation", { input }, "addReviewNote"),
  };
};
