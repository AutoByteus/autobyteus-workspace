export type ApplicationExecutionProducer = Readonly<{
  agentRunId: string;
  displayName: string | null;
}>;

export type ApplicationExecutionContext = Readonly<{
  applicationId: string;
  bindingId: string;
  producer: ApplicationExecutionProducer;
}>;
