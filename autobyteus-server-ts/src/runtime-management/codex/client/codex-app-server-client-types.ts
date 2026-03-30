export type JsonRpcId = number | string;

export interface CodexAppServerClientOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  requestTimeoutMs?: number;
}

export interface CodexNotificationMessage {
  method: string;
  params: Record<string, unknown>;
}

export interface CodexServerRequestMessage extends CodexNotificationMessage {
  id: JsonRpcId;
}
