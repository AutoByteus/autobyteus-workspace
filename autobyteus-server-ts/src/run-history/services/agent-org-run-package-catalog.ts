import type { RootRunPackageReadinessDiagnostic } from "./root-run-package-readiness-index.js";
import { RootRunPackageReadinessIndex } from "./root-run-package-readiness-index.js";

export type AgentOrgRunPackageDiagnostic = Readonly<{
  orgRunId: string;
  path: string;
  reason: string;
}>;

/** Org-family view over the compound current root-package readiness index. */
export class AgentOrgRunPackageCatalog {
  private readonly readiness: RootRunPackageReadinessIndex;

  constructor(memoryDir: string) {
    this.readiness = new RootRunPackageReadinessIndex(memoryDir);
  }

  isInitialized(): boolean { return this.readiness.isInitialized(); }
  awaitReady(): Promise<void> { return this.readiness.awaitReady(); }
  isAdmitted(id: string): boolean { return this.readiness.isAdmitted("agent_org", id); }
  listAdmitted(): string[] { return [...this.readiness.listAdmitted("agent_org")]; }
  listDiagnostics(): readonly AgentOrgRunPackageDiagnostic[] {
    return this.readiness.listDiagnostics("agent_org").map(projectDiagnostic);
  }
  admit(id: string): void { this.readiness.admitCurrent("agent_org", id); }
  exclude(id: string, reason: string): void {
    this.readiness.excludeCurrent("agent_org", id, reason);
  }
  rebuild(): Promise<void> { return this.readiness.rebuild(); }
}

const projectDiagnostic = (
  diagnostic: RootRunPackageReadinessDiagnostic,
): AgentOrgRunPackageDiagnostic => Object.freeze({
  orgRunId: diagnostic.rootRunId,
  path: diagnostic.packagePath,
  reason: `${diagnostic.code}: ${diagnostic.reason}`,
});
