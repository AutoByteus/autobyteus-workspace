import {
  AccountPeerCandidateIndex,
  type AccountPeerCandidate,
  type AccountPeerCandidateIndexConfig,
  type AccountPeerCandidateObservation,
  type ListAccountPeerCandidatesOptions,
  type ListAccountPeerCandidatesResult,
} from "../shared/account-peer-candidate-index.js";

export type DiscordPeerCandidate = AccountPeerCandidate;
export type DiscordPeerCandidateObservation = AccountPeerCandidateObservation;
export type ListDiscordPeerCandidatesOptions = ListAccountPeerCandidatesOptions;
export type ListDiscordPeerCandidatesResult = ListAccountPeerCandidatesResult;
export type DiscordPeerCandidateIndexConfig = AccountPeerCandidateIndexConfig;

export class DiscordPeerCandidateIndex extends AccountPeerCandidateIndex {}
