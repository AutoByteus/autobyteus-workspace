import { createApplicationClient } from "./vendor/application-frontend-sdk.js";
import { createBriefStudioApp } from "./brief-studio-runtime.js";

createBriefStudioApp({
  browserWindow: window,
  document,
  createApplicationClient,
}).init();
