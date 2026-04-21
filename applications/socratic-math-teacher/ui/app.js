import { createSocraticMathGraphqlClient } from "./generated/graphql-client.js";
import { createSocraticMathTeacherApp } from "./socratic-runtime.js";

createSocraticMathTeacherApp({
  browserWindow: window,
  document,
  createSocraticMathGraphqlClient,
}).init();
