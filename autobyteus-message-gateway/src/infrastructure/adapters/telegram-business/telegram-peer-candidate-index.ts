import {
  AccountPeerCandidateIndex,
  type AccountPeerCandidate,
  type AccountPeerCandidateIndexConfig,
  type AccountPeerCandidateObservation,
  type ListAccountPeerCandidatesOptions,
  type ListAccountPeerCandidatesResult,
} from "../shared/account-peer-candidate-index.js";

export type TelegramPeerCandidate = AccountPeerCandidate;
export type TelegramPeerCandidateObservation = AccountPeerCandidateObservation;
export type ListTelegramPeerCandidatesOptions = ListAccountPeerCandidatesOptions;
export type ListTelegramPeerCandidatesResult = ListAccountPeerCandidatesResult;
export type TelegramPeerCandidateIndexConfig = AccountPeerCandidateIndexConfig;

export class TelegramPeerCandidateIndex extends AccountPeerCandidateIndex {}
