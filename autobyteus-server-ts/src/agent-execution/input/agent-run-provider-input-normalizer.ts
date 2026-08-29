import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import type { ContextFileLocalPathResolver } from "../../context-files/services/context-file-local-path-resolver.js";
import type { AgentRunBackendInputDispatch } from "./agent-run-input-contract.js";

type ContextFilePathResolver = Pick<ContextFileLocalPathResolver, "resolve">;

export class AgentRunProviderInputNormalizer {
  private readonly localPathResolver: ContextFilePathResolver;

  constructor(localPathResolver: ContextFilePathResolver) {
    if (!localPathResolver || typeof localPathResolver.resolve !== "function") {
      throw new Error("AgentRun provider input local-path resolver is required.");
    }
    this.localPathResolver = localPathResolver;
  }

  normalizeForProvider(
    dispatch: AgentRunBackendInputDispatch,
  ): AgentRunBackendInputDispatch {
    const message = dispatch.message;
    const contextFiles = message.contextFiles === null
      ? null
      : message.contextFiles.map((source) => {
          let selectedUri = source.uri;
          try {
            selectedUri = this.localPathResolver.resolve(source.uri) ?? source.uri;
          } catch {
            selectedUri = source.uri;
          }
          const copy = new ContextFile(
            selectedUri,
            source.fileType,
            source.fileName,
            { ...source.metadata },
          );
          copy.fileType = source.fileType;
          copy.fileName = source.fileName;
          return copy;
        });
    const copiedMessage = new AgentInputUserMessage(
      message.content,
      message.senderType,
      contextFiles,
      { ...message.metadata },
    );
    return dispatch.kind === "start_turn"
      ? { kind: dispatch.kind, message: copiedMessage }
      : {
          kind: dispatch.kind,
          turnId: dispatch.turnId,
          message: copiedMessage,
        };
  }
}
