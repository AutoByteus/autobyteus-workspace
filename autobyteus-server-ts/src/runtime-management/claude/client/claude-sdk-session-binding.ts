export type ClaudeSdkSessionBinding =
  | Readonly<{ kind: "create"; sessionId: string }>
  | Readonly<{ kind: "resume"; sessionId: string }>;
