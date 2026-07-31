import type { ApplicationPlatformLifecycle } from "./application-platform-lifecycle.js";
import type {
  ApplicationPlatformHostManagementContracts,
  ApplicationPlatformRealtimeContracts,
  ApplicationPlatformRestContracts,
} from "./application-platform-runtime-contracts.js";

export type ApplicationPlatformRuntime = Readonly<{
  lifecycle: ApplicationPlatformLifecycle;
  rest: ApplicationPlatformRestContracts;
  realtime: ApplicationPlatformRealtimeContracts;
  hostManagement: ApplicationPlatformHostManagementContracts;
}>;
