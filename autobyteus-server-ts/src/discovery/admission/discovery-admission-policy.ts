import type { DiscoveryAdmissionMode } from "../config/discovery-admission-mode.js";

export type DiscoveryAdmissionInput = {
  nodeId: string;
  baseUrl: string;
  requestIp?: string | null;
};

export type DiscoveryAdmissionDecision = {
  allow: boolean;
  code?: string;
  reason?: string;
};

export interface DiscoveryAdmissionPolicy {
  evaluateAdmission(input: DiscoveryAdmissionInput): DiscoveryAdmissionDecision;
}

export const allowAllLanAdmissionPolicy = (): DiscoveryAdmissionPolicy => ({
  evaluateAdmission(_input: DiscoveryAdmissionInput): DiscoveryAdmissionDecision {
    return { allow: true };
  },
});

export const createDiscoveryAdmissionPolicy = (
  mode: DiscoveryAdmissionMode,
): DiscoveryAdmissionPolicy => {
  if (mode === "lan_open") {
    return allowAllLanAdmissionPolicy();
  }

  throw new Error(`UNSUPPORTED_DISCOVERY_ADMISSION_MODE: '${mode}'.`);
};
