import { startHostedApplication } from "./vendor/application-frontend-sdk.js";
import { createBriefStudioGraphqlClient } from "./generated/graphql-client.js";
import { mountBriefStudio } from "./brief-studio-runtime.js";

startHostedApplication({
  rootElement: document.getElementById("app-root"),
  onBootstrapped: ({ bootstrap, applicationClient, rootElement }) => {
    mountBriefStudio({
      applicationClient,
      bootstrap,
      browserWindow: window,
      createBriefStudioGraphqlClient,
      rootElement,
    });
  },
});
