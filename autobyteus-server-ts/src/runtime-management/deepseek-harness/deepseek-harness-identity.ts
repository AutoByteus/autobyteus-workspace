import { DEEPSEEK_PROVIDER_RELAY_ID } from "../../credential-proxy/provider-relays/provider-relays.js";

/** DeepSeek Harness (`dsh`), DeepSeek's own agent program, run over ACP (`dsh --profile acp`). */
export const DEEPSEEK_HARNESS_AGENT_LABEL = "DeepSeek Harness";
export const DEEPSEEK_HARNESS_PROVIDER_NAME = "DeepSeek Harness";

/** The provider relay dsh's model calls go through (DeepSeek's Messages API). */
export const DEEPSEEK_HARNESS_RELAY_ID = DEEPSEEK_PROVIDER_RELAY_ID;

/** dsh's own name for its route to DeepSeek's official API (the group of its model options). */
export const DSH_PROVIDER_ROUTE = "deepseek-official";

export const DEEPSEEK_HARNESS_NPM_PACKAGE = "@deepseek-ai/dsh";
export const DEEPSEEK_HARNESS_INSTALL_URL = "https://github.com/deepseek-ai/deepseek-harness";

/** `DEEPSEEK_HARNESS_COMMAND` when set, else `dsh` on the server's PATH. */
export const deepSeekHarnessCommand = (): string => process.env.DEEPSEEK_HARNESS_COMMAND?.trim() || "dsh";
