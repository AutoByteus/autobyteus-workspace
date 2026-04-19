import {
  createApplicationBackendMountTransport,
  createApplicationClient,
} from "../vendor/application-frontend-sdk.js";

const LESSONS_QUERY = `query LessonsQuery {
  lessons {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
  }
}`;

const LESSON_QUERY = `query LessonQuery($lessonId: ID!) {
  lesson(lessonId: $lessonId) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;

const START_LESSON_MUTATION = `mutation StartLessonMutation($input: StartLessonInput!) {
  startLesson(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;

const ASK_FOLLOW_UP_MUTATION = `mutation AskFollowUpMutation($input: AskFollowUpInput!) {
  askFollowUp(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;

const REQUEST_HINT_MUTATION = `mutation RequestHintMutation($input: RequestHintInput!) {
  requestHint(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
  }
}`;

const CLOSE_LESSON_MUTATION = `mutation CloseLessonMutation($input: CloseLessonInput!) {
  closeLesson(input: $input) {
    lessonId
    prompt
    status
    latestBindingId
    latestRunId
    latestBindingStatus
    lastErrorMessage
    updatedAt
    createdAt
    closedAt
    messages {
      messageId
      lessonId
      role
      kind
      body
      createdAt
    }
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

export const createSocraticMathGraphqlClient = (bootstrap) => {
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
    lessons: () => execute(LESSONS_QUERY, "LessonsQuery", null, "lessons"),
    lesson: (lessonId) => execute(LESSON_QUERY, "LessonQuery", { lessonId }, "lesson"),
    startLesson: (input) => execute(START_LESSON_MUTATION, "StartLessonMutation", { input }, "startLesson"),
    askFollowUp: (input) => execute(ASK_FOLLOW_UP_MUTATION, "AskFollowUpMutation", { input }, "askFollowUp"),
    requestHint: (input) => execute(REQUEST_HINT_MUTATION, "RequestHintMutation", { input }, "requestHint"),
    closeLesson: (input) => execute(CLOSE_LESSON_MUTATION, "CloseLessonMutation", { input }, "closeLesson"),
  };
};
