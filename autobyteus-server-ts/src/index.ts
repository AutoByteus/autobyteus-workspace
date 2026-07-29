export { startServer, type ServerOptions } from "./app.js";
export { startConfiguredServer } from "./server-runtime.js";
export {
  buildStudioServerComposition,
  type StudioServerComposition,
} from "./compositions/build-studio-server-composition.js";
export {
  startStandaloneApplicationHost,
  type StandaloneApplicationHostHandle,
} from "./standalone-application-host/start-standalone-application-host.js";
export type {
  StandaloneApplicationHostConfig,
  StandaloneApplicationHostConfigInput,
} from "./standalone-application-host/config/standalone-application-host-config.js";
export {
  validateStandaloneApplicationPackage,
} from "./application-platform/launch-configuration/application-standalone-package-validator.js";
