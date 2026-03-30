import type { JsonObject } from "../codex-app-server-json.js";

export type CodexAppServerMessage = {
  method: string;
  params: JsonObject;
  request_id?: string | number;
};
