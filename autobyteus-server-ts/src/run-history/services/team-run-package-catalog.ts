import {
  RootRunPackageReadinessIndex,
  resetRootRunPackageReadinessIndex,
} from "./root-run-package-readiness-index.js";

/** Team-family view over the compound current root-package readiness index. */
export class TeamRunPackageCatalog {
  private readonly readiness: RootRunPackageReadinessIndex;

  constructor(memoryDir: string) {
    this.readiness = new RootRunPackageReadinessIndex(memoryDir);
  }

  isInitialized(): boolean { return this.readiness.isInitialized(); }
  awaitReady(): Promise<void> { return this.readiness.awaitReady(); }
  isAdmitted(rootTeamRunId: string): boolean {
    return this.readiness.isAdmitted("agent_team", rootTeamRunId);
  }
  listAdmittedRootIds(): string[] {
    return [...this.readiness.listAdmitted("agent_team")];
  }
  getDiagnostics(): ReadonlyMap<string, string> {
    return new Map(this.readiness.listDiagnostics("agent_team")
      .map((item) => [item.rootRunId, `${item.code}: ${item.reason}`]));
  }
  admit(rootTeamRunId: string): void {
    this.readiness.admitCurrent("agent_team", rootTeamRunId);
  }
  exclude(rootTeamRunId: string, reason: string): void {
    this.readiness.excludeCurrent("agent_team", rootTeamRunId, reason);
  }
  rebuild(): Promise<void> { return this.readiness.rebuild(); }
}

export const resetTeamRunPackageCatalog = (memoryDir: string): void => {
  resetRootRunPackageReadinessIndex(memoryDir);
};
