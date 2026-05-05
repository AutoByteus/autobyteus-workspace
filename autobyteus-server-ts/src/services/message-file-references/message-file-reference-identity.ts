import { createHash } from "node:crypto";

const normalizeIdentityPart = (value: string | null | undefined): string =>
  (value ?? "").trim();

export const normalizeMessageFileReferencePath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

export const buildMessageFileReferenceId = (input: {
  teamRunId: string;
  senderRunId: string;
  receiverRunId: string;
  path: string;
}): string => {
  const hashInput = [
    normalizeIdentityPart(input.teamRunId),
    normalizeIdentityPart(input.senderRunId),
    normalizeIdentityPart(input.receiverRunId),
    normalizeMessageFileReferencePath(input.path),
  ].join("\0");
  return `msgref_${createHash("sha256").update(hashInput).digest("base64url").slice(0, 32)}`;
};
