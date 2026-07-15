import {
  normalizeExplicitAbsoluteLocalReferenceFiles,
  validateExplicitAbsoluteLocalReferenceFile,
  type ExplicitAbsoluteLocalReferenceFileValidationError,
  type NormalizeExplicitAbsoluteLocalReferenceFilesResult,
} from "../../services/reference-files/absolute-local-reference-files.js";

export type ExplicitAgentCommunicationReferenceFileValidationError =
  ExplicitAbsoluteLocalReferenceFileValidationError;

export type NormalizeExplicitAgentCommunicationReferenceFilesResult =
  NormalizeExplicitAbsoluteLocalReferenceFilesResult;

export const validateExplicitAgentCommunicationReferenceFile =
  validateExplicitAbsoluteLocalReferenceFile;

export const normalizeExplicitAgentCommunicationReferenceFiles = (
  rawReferenceFiles: unknown,
): NormalizeExplicitAgentCommunicationReferenceFilesResult =>
  normalizeExplicitAbsoluteLocalReferenceFiles(rawReferenceFiles);
