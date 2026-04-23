import { startHostedApplication } from "./vendor/application-frontend-sdk.js";
import { createSocraticMathGraphqlClient } from "./generated/graphql-client.js";
import { mountSocraticMathTeacher } from "./socratic-runtime.js";

startHostedApplication({
  rootElement: document.getElementById("app-root"),
  onBootstrapped: ({ bootstrap, applicationClient, rootElement }) => {
    mountSocraticMathTeacher({
      applicationClient,
      bootstrap,
      browserWindow: window,
      createSocraticMathGraphqlClient,
      rootElement,
    });
  },
});
