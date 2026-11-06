import path from "node:path";
import {
  releaseNothing,
  type AcpAgentLaunchProfile,
  type AcpDiscoveryLaunchRequest,
  type AcpLaunch,
  type AcpRunLaunchRequest,
} from "../acp/acp-agent-launch-profile.js";
import { getDeepSeekHarnessHome, type DeepSeekHarnessHome } from "./deepseek-harness-home.js";
import { DSH_INSTRUCTIONS_FILE_VARIABLE, DSH_SKILLS_DIR_VARIABLE } from "./deepseek-harness-home-files.js";
import {
  DEEPSEEK_HARNESS_AGENT_LABEL,
  DEEPSEEK_HARNESS_RELAY_ID,
  deepSeekHarnessCommand,
} from "./deepseek-harness-identity.js";

/** The workspace folder dsh's skills are linked into for a run (given to dsh as its one skills folder). */
export const DSH_WORKSPACE_SKILLS_SEGMENTS = Object.freeze([".dsh", "skills"]);

const DSH_ARGS = Object.freeze(["--profile", "acp"]);

/**
 * The server environment for a dsh process: `DSH_HOME` is the AutoByteus-owned home, `DEEPSEEK_BASE_URL` the provider
 * relay, and `DEEPSEEK_API_KEY` the run's pass (never a key; a discovery launch has none). dsh's permission mode comes
 * from its profile, not from the server's environment.
 */
const dshEnvironment = (home: DeepSeekHarnessHome, relay: Readonly<Record<string, string>>): NodeJS.ProcessEnv => {
  const { DSH_PERMISSION_MODE: _mode, DEEPSEEK_API_KEY: _key, DEEPSEEK_BASE_URL: _url, ...inherited } = process.env;
  return { ...inherited, DSH_HOME: home.homeDir, ...relay };
};

export const createDeepSeekHarnessLaunchProfile = (
  homeOf: () => DeepSeekHarnessHome = getDeepSeekHarnessHome,
): AcpAgentLaunchProfile => Object.freeze({
  agentLabel: DEEPSEEK_HARNESS_AGENT_LABEL,
  providerRelayId: DEEPSEEK_HARNESS_RELAY_ID,
  command: deepSeekHarnessCommand,

  /** The run's instructions file and skills folder for the home patch; the run folder goes with `release`. */
  async runLaunch(request: AcpRunLaunchRequest): Promise<AcpLaunch> {
    if (!request.relayAccess) throw new Error("ACP_LAUNCH_INVALID: DeepSeek Harness runs only through its provider relay.");
    const home = homeOf();
    await home.ensure();
    const files = await home.prepareRun(request.runId, request.instructions);
    return Object.freeze({
      args: DSH_ARGS,
      env: {
        ...dshEnvironment(home, {
          DEEPSEEK_BASE_URL: request.relayAccess.baseUrl,
          DEEPSEEK_API_KEY: request.relayAccess.apiKey,
        }),
        [DSH_INSTRUCTIONS_FILE_VARIABLE]: files.instructionsFile,
        [DSH_SKILLS_DIR_VARIABLE]: path.join(request.workingDirectory, ...DSH_WORKSPACE_SKILLS_SEGMENTS),
      },
      release: files.release,
    });
  },

  /** No pass: discovery opens a session and reads its options, it makes no model call. */
  async discoveryLaunch(request: AcpDiscoveryLaunchRequest): Promise<AcpLaunch> {
    const home = homeOf();
    await home.ensure();
    return Object.freeze({
      args: DSH_ARGS,
      env: dshEnvironment(home, request.relayBaseUrl ? { DEEPSEEK_BASE_URL: request.relayBaseUrl } : {}),
      release: releaseNothing,
    });
  },
});

export const deepSeekHarnessLaunchProfile = createDeepSeekHarnessLaunchProfile();
