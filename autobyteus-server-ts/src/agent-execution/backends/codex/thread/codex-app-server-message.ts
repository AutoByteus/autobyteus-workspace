import type { JsonObject } from "../codex-app-server-json.js";

export type CodexAppServerMessage = {
  method: string;
  params: JsonObject;
  request_id?: string | number;
};

export type CodexLocalDerivedEventInput = Readonly<{
  method: string;
  params: Readonly<JsonObject>;
  request_id?: string | number;
}>;
