import { startApplication } from "@autobyteus/application-frontend-sdk";
import { createBriefStudioGraphqlClient } from "./generated/graphql-client.js";
import { mountBriefStudio } from "./brief-studio-runtime.js";

const startupHandle = startApplication({
  rootElement: document.getElementById("app-root"),
  onBootstrapped: ({ runtimeBootstrap, applicationClient, rootElement }) => {
    mountBriefStudio({
      applicationClient,
      runtimeBootstrap,
      browserWindow: window,
      createBriefStudioGraphqlClient,
      rootElement,
    });
  },
});

window.addEventListener("pagehide", () => startupHandle.dispose(), { once: true });
