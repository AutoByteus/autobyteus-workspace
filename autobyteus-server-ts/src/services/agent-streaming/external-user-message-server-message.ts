import type { ExternalAttachment } from "autobyteus-ts/external-channel/external-attachment.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  buildMemberRouteKeyFromPath,
  normalizeMemberPath,
} from "../../agent-team-execution/domain/team-run-member-identity.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import { ServerMessage, ServerMessageType } from "./models.js";

export const createExternalUserMessageServerMessage = (input: {
  envelope: ExternalMessageEnvelope;
  agentName?: string | null;
  agentId?: string | null;
  memberRouteKey?: string | null;
  memberPath?: readonly string[] | null;
  sourceRouteKey?: string | null;
  sourcePath?: readonly string[] | null;
}): ServerMessage => {
  const identity = normalizeExternalUserMessageMemberIdentity(input);
  return new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
    content: input.envelope.content,
    received_at: input.envelope.receivedAt,
    provider: input.envelope.provider,
    transport: input.envelope.transport,
    account_id: input.envelope.accountId,
    peer_id: input.envelope.peerId,
    thread_id: input.envelope.threadId,
    external_message_id: input.envelope.externalMessageId,
    context_file_paths: input.envelope.attachments
      .map((attachment) => mapAttachmentToContextFilePath(attachment))
      .filter(
        (
          item,
        ): item is {
          path: string;
          type: "Audio" | "Image" | "Video";
        } => item !== null,
      ),
    ...(input.agentName ? { agent_name: input.agentName } : {}),
    ...(input.agentId ? { agent_id: input.agentId } : {}),
    ...(identity.memberRouteKey ? { member_route_key: identity.memberRouteKey } : {}),
    ...(identity.memberPath ? { member_path: identity.memberPath } : {}),
    ...(identity.sourceRouteKey ? { source_route_key: identity.sourceRouteKey } : {}),
    ...(identity.sourcePath ? { source_path: identity.sourcePath } : {}),
  });
};

const normalizeExternalUserMessageMemberIdentity = (input: {
  memberRouteKey?: string | null;
  memberPath?: readonly string[] | null;
  sourceRouteKey?: string | null;
  sourcePath?: readonly string[] | null;
}): {
  memberRouteKey: string | null;
  memberPath: string[] | null;
  sourceRouteKey: string | null;
  sourcePath: string[] | null;
} => {
  const sourcePath = normalizeOptionalMemberPath(input.sourcePath ?? null);
  const memberPath = normalizeOptionalMemberPath(input.memberPath ?? null) ?? sourcePath;
  const sourceRouteKey = normalizeOptionalRouteKey(input.sourceRouteKey ?? null)
    ?? (sourcePath ? buildMemberRouteKeyFromPath(sourcePath) : null);
  const memberRouteKey = normalizeOptionalRouteKey(input.memberRouteKey ?? null)
    ?? (memberPath ? buildMemberRouteKeyFromPath(memberPath) : sourceRouteKey);

  const resolvedMemberPath = memberPath ?? routeKeyToMemberPath(memberRouteKey);
  const resolvedSourcePath = sourcePath ?? routeKeyToMemberPath(sourceRouteKey ?? memberRouteKey);
  const resolvedSourceRouteKey = sourceRouteKey ?? memberRouteKey;

  return {
    memberRouteKey,
    memberPath: resolvedMemberPath,
    sourceRouteKey: resolvedSourceRouteKey,
    sourcePath: resolvedSourcePath,
  };
};

const normalizeOptionalMemberPath = (
  value: readonly string[] | null,
): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  try {
    return normalizeMemberPath(value);
  } catch {
    return null;
  }
};

const normalizeOptionalRouteKey = (value: string | null): string | null => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    return normalizeMemberRouteKey(value);
  } catch {
    return null;
  }
};

const routeKeyToMemberPath = (routeKey: string | null): string[] | null =>
  routeKey ? routeKey.split("/").map((segment) => segment.trim()).filter(Boolean) : null;

const mapAttachmentToContextFilePath = (
  attachment: ExternalAttachment,
):
  | {
      path: string;
      type: "Audio" | "Image" | "Video";
    }
  | null => {
  if (typeof attachment.url !== "string" || attachment.url.trim().length === 0) {
    return null;
  }

  const kind = attachment.kind.trim().toLowerCase();
  const mimeType = attachment.mimeType?.trim().toLowerCase() ?? "";
  if (kind === "audio" || mimeType.startsWith("audio/")) {
    return {
      path: attachment.url,
      type: "Audio",
    };
  }
  if (kind === "image" || mimeType.startsWith("image/")) {
    return {
      path: attachment.url,
      type: "Image",
    };
  }
  if (kind === "video" || mimeType.startsWith("video/")) {
    return {
      path: attachment.url,
      type: "Video",
    };
  }
  return null;
};
