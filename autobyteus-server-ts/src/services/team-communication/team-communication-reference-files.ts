import {
  normalizeExplicitAbsoluteLocalReferenceFiles,
  validateExplicitAbsoluteLocalReferenceFile,
  type ExplicitAbsoluteLocalReferenceFileValidationError,
  type NormalizeExplicitAbsoluteLocalReferenceFilesResult,
} from "../reference-files/absolute-local-reference-files.js";

export type ExplicitTeamCommunicationReferenceFileValidationError =
  ExplicitAbsoluteLocalReferenceFileValidationError;

export type NormalizeExplicitTeamCommunicationReferenceFilesResult =
  NormalizeExplicitAbsoluteLocalReferenceFilesResult;

export const validateExplicitTeamCommunicationReferenceFile =
  validateExplicitAbsoluteLocalReferenceFile;

export const normalizeExplicitTeamCommunicationReferenceFiles = (
  rawReferenceFiles: unknown,
): NormalizeExplicitTeamCommunicationReferenceFilesResult =>
  normalizeExplicitAbsoluteLocalReferenceFiles(rawReferenceFiles);
