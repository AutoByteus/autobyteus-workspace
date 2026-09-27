import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { ContextFileCurrentReferenceValidator, closeUnavailableDependencies, isContextFileReferenceUnavailable } from "../../context-files/services/context-file-current-reference-validator.js";
import { RootRunPackageCurrentValidator, packageKey,
  type RootRunPackageFamily, type RootRunPackageReadinessDiagnostic } from "./root-run-package-current-validator.js";
export type { RootRunPackageFamily, RootRunPackageReadinessDiagnostic } from "./root-run-package-current-validator.js";

type ReadinessState = {
  initialized: boolean; admitted: Set<string>; diagnostics: RootRunPackageReadinessDiagnostic[];
  rebuildPromise: Promise<void> | null; mutationRevision: number; dependencies: Map<string, Set<string>>;
};
const states = new Map<string, ReadinessState>();
const stateFor = (memoryDir: string): ReadinessState => {
  const key = path.resolve(memoryDir);
  let state = states.get(key);
  if (!state) {
    state = { initialized: false, admitted: new Set(), diagnostics: [], rebuildPromise: null, mutationRevision: 0, dependencies: new Map() };
    states.set(key, state);
  }
  return state;
};

/** One coherent current-only admission snapshot, independent of any migration ledger. */
export class RootRunPackageReadinessIndex {
  private readonly state: ReadinessState;
  private readonly validator: RootRunPackageCurrentValidator;
  constructor(private readonly memoryDir: string,
    stores?: ConstructorParameters<typeof RootRunPackageCurrentValidator>[1],
    private readonly baseUrl: () => string = () => appConfigProvider.config.getBaseUrl(),
  ) {
    this.state = stateFor(memoryDir);
    this.validator = new RootRunPackageCurrentValidator(memoryDir, stores);
  }
  isInitialized(): boolean { return this.state.initialized; }
  awaitReady(): Promise<void> {
    return this.state.rebuildPromise ?? (this.state.initialized ? Promise.resolve() : this.rebuild());
  }
  isAdmitted(family: RootRunPackageFamily, id: string): boolean { return this.state.admitted.has(packageKey(family, id.trim())); }
  async assertAdmitted(family: RootRunPackageFamily, id: string): Promise<void> {
    await this.awaitReady();
    if (!this.isAdmitted(family, id)) throw new Error(`Run package '${family}:${id}' is unavailable.`);
  }
  listAdmitted(family: RootRunPackageFamily): readonly string[] {
    const prefix = `${family}:`;
    return Object.freeze([...this.state.admitted].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)).sort());
  }
  listDiagnostics(family?: RootRunPackageFamily): readonly RootRunPackageReadinessDiagnostic[] {
    return Object.freeze(this.state.diagnostics.filter((item) => family === undefined || item.rootSubjectKind === family).map((item) => Object.freeze({...item})));
  }
  /** Publishing a new tree cannot clear a reference exclusion without validating the package and its closure. */
  async admitCurrent(family: RootRunPackageFamily, id: string): Promise<void> {
    if (!id.trim()) throw new Error("rootRunId is required.");
    this.state.mutationRevision += 1;
    await this.rebuild();
    if (!this.isAdmitted(family, id)) throw new Error(`Current run package '${family}:${id}' could not be admitted.`);
  }
  excludeCurrent(family: RootRunPackageFamily, id: string, reason: string): void {
    this.state.admitted.delete(packageKey(family, id.trim()));
    this.state.diagnostics = this.state.diagnostics.filter((item) => item.rootSubjectKind !== family || item.rootRunId !== id);
    this.state.diagnostics.push({ rootSubjectKind: family, rootRunId: id, packagePath: this.memoryDir,
      code: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", reason });
    const unavailable = new Set([packageKey(family, id.trim())]);
    closeUnavailableDependencies(this.state.dependencies, unavailable, (key) => this.state.admitted.delete(key));
    this.state.mutationRevision += 1;
  }
  rebuild(): Promise<void> {
    if (this.state.rebuildPromise) return this.state.rebuildPromise;
    const attempt = this.rebuildUntilStable();
    this.state.rebuildPromise = attempt;
    void attempt.finally(() => { if (this.state.rebuildPromise === attempt) this.state.rebuildPromise = null; }).catch(() => undefined);
    return attempt;
  }
  private async rebuildUntilStable(): Promise<void> {
    while (true) {
      const revision = this.state.mutationRevision;
      let snapshot;
      try { snapshot = await this.validator.scan(); }
      catch (error) {
        // Discovery is unavailable, not evidence of valid individual roots or a missing core schema.
        this.state.admitted.clear();
        this.state.dependencies.clear();
        this.state.diagnostics = [{rootSubjectKind: "agent_team", rootRunId: "*", packagePath: this.memoryDir,
          code: "FAILED_ATTEMPT", reason: `History discovery unavailable: ${error instanceof Error ? error.message : String(error)}`}];
        this.state.initialized = true;
        console.warn(this.state.diagnostics[0]!.reason);
        return;
      }
      const references = new ContextFileCurrentReferenceValidator(this.memoryDir, this.baseUrl, snapshot.groups);
      const unavailable = new Set(snapshot.diagnostics.map((d) => packageKey(d.rootSubjectKind, d.rootRunId)));
      const dependencies = new Map<string, Set<string>>();
      const record = (key: string, code: RootRunPackageReadinessDiagnostic["code"], reason: string) => {
        const group = snapshot.groups.find((item) => item.key === key)!;
        snapshot.diagnostics.push({rootSubjectKind: group.family, rootRunId: group.id, packagePath: group.directory, code, reason});
      };
      for (const group of snapshot.groups) {
        const refs = new Set<string>();
        dependencies.set(group.key, refs);
        try { await references.validate(group, refs); }
        catch (error) {
          unavailable.add(group.key);
          record(group.key, isContextFileReferenceUnavailable(error) ? "REFERENCE_UNAVAILABLE" : "FAILED_ATTEMPT", error instanceof Error ? error.message : String(error));
        }
      }
      closeUnavailableDependencies(dependencies, unavailable, (key, ref) => record(key, "DEPENDENCY_UNAVAILABLE", `Referenced package '${ref}' is unavailable.`));
      if (revision !== this.state.mutationRevision) continue;
      this.state.admitted = new Set(snapshot.groups.filter((group) => !unavailable.has(group.key)).map((group) => group.key));
      this.state.dependencies = dependencies;
      this.state.diagnostics = snapshot.diagnostics;
      this.state.initialized = true;
      return;
    }
  }
}
export const resetRootRunPackageReadinessIndex = (memoryDir: string): void => { states.delete(path.resolve(memoryDir)); };
