import { startApplication } from "@autobyteus/application-frontend-sdk";
import { createSocraticMathGraphqlClient } from "./generated/graphql-client.js";
import { mountSocraticMathTeacher } from "./socratic-runtime.js";

const startupHandle = startApplication({
  rootElement: document.getElementById("app-root"),
  onBootstrapped: ({ runtimeBootstrap, applicationClient, rootElement }) => {
    mountSocraticMathTeacher({
      applicationClient,
      runtimeBootstrap,
      browserWindow: window,
      createSocraticMathGraphqlClient,
      rootElement,
    });
  },
});

window.addEventListener("pagehide", () => startupHandle.dispose(), { once: true });
