import type { InitializeResponse } from "@agentclientprotocol/sdk";
import type { AcpClientConnection } from "../../../runtime-management/acp/acp-client-connection.js";
import type { PrivateSkillRuntime, RuntimeSkillProfile } from "../shared/runtime-skill-profile.js";

/** Native-specific skills-only plugin support, composed by the selected ACP backend. */
export interface AcpPrivateSkillAdapter {
  readonly runtime: PrivateSkillRuntime;
  launchArgs(args: readonly string[], profile: RuntimeSkillProfile): string[];
  validate(connection: AcpClientConnection, initialized: InitializeResponse, profile: RuntimeSkillProfile): Promise<void>;
}
