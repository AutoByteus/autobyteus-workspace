import { createBriefStudioGraphqlClient } from "./generated/graphql-client.js";
import { createBriefStudioApp } from "./brief-studio-runtime.js";

createBriefStudioApp({
  browserWindow: window,
  document,
  createBriefStudioGraphqlClient,
}).init();
