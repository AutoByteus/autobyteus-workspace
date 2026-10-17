import type {
  AgentPackageDefinitionKind,
  DefinitionByKind,
  DefinitionFolderLocation,
  DefinitionFolderReadResult,
  DefinitionFolderRef,
  DefinitionLoadIssue,
  DefinitionLoadIssueEntry,
  DefinitionReadResult,
  KindDefinitionReadResult,
} from "../domain/agent-package-definition-types.js";

type AnyDefinition = DefinitionByKind[AgentPackageDefinitionKind];

/** One stored definition: its last working version (if any), that version's fingerprint and its load issue. */
type StoredDefinition = {
  kind: AgentPackageDefinitionKind;
  id: string;
  definition: AnyDefinition | null;
  fingerprint: string | null;
  issue: DefinitionLoadIssue | null;
};

/** One stored definition folder: its own definition plus the definitions nested in it, in path order. */
type StoredDefinitionFolder = {
  kind: AgentPackageDefinitionKind;
  folderId: string;
  location: DefinitionFolderLocation;
  root: StoredDefinition;
  nested: Map<string, StoredDefinition>;
};

/** A read-only view of one stored definition; `definition` is a copy owned by the caller. */
export type AgentPackageDefinitionEntry<K extends AgentPackageDefinitionKind> = Readonly<{
  kind: K;
  id: string;
  definition: DefinitionByKind[K] | null;
  issue: DefinitionLoadIssue | null;
  location: DefinitionFolderLocation;
  folder: DefinitionFolderRef;
  isFolderRoot: boolean;
}>;

/** Deep copy that keeps class prototypes, so callers can never mutate a stored definition. */
const cloneValue = <T>(value: T): T => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;
  const copy = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    copy[key] = cloneValue((value as Record<string, unknown>)[key]);
  }
  return copy as T;
};

const sameIssue = (left: DefinitionLoadIssue | null, right: DefinitionLoadIssue | null): boolean =>
  left === right || (left !== null && right !== null
    && left.code === right.code
    && left.reason === right.reason
    && left.definitionPath === right.definitionPath
    && left.packageRoot === right.packageRoot);

const definitionKey = (kind: AgentPackageDefinitionKind, id: string): string => `${kind}\u0000${id}`;

/**
 * The in-memory agent package definitions of all three kinds, with their last working versions
 * and load issues. It applies the last-good rule to every definition and never performs I/O.
 * `AgentPackageDefinitionReloader` is its only writer; every read returns copies.
 */
export class AgentPackageDefinitionStore {
  private readonly folders: Record<AgentPackageDefinitionKind, Map<string, StoredDefinitionFolder>> = {
    agent: new Map(),
    agent_team: new Map(),
    agent_org: new Map(),
  };
  private readonly folderIndex = new Map<string, DefinitionFolderRef>();

  /** Applies one definition folder read. Returns whether anything a reader can observe changed. */
  apply(kind: AgentPackageDefinitionKind, folderId: string, read: DefinitionFolderReadResult): boolean {
    if (read.status === "absent") return this.remove(kind, folderId);
    const previous = this.folders[kind].get(folderId) ?? null;
    const rootResult = this.applyDefinition(previous?.root, folderId, read.root, read.location);
    if (!rootResult.stored) return this.remove(kind, folderId);

    let changed = rootResult.changed
      || !previous
      || previous.location.folderDir !== read.location.folderDir
      || previous.location.packageRoot !== read.location.packageRoot;
    let nested: Map<string, StoredDefinition>;
    if (read.nested === null) {
      nested = previous?.nested ?? new Map();
    } else {
      nested = new Map();
      // Reader order first (path order), so nested definitions stay in path order after edits.
      const ids = new Set<string>([...read.nested.keys(), ...(previous?.nested.keys() ?? [])]);
      for (const id of ids) {
        const next = read.nested.get(id);
        const result = next
          ? this.applyDefinition(previous?.nested.get(id), id, next, read.location)
          : { stored: null, changed: previous?.nested.has(id) ?? false };
        if (result.stored) nested.set(id, result.stored);
        changed ||= result.changed;
      }
    }

    if (previous) this.unindex(previous);
    const folder: StoredDefinitionFolder = { kind, folderId, location: read.location, root: rootResult.stored, nested };
    this.folders[kind].set(folderId, folder);
    this.index(folder);
    return changed;
  }

  /**
   * Keeps the whole definition folder (last working versions) and records that its package
   * folder is missing, or present but unreadable (`unreadableReason`).
   */
  markSourceUnavailable(kind: AgentPackageDefinitionKind, folderId: string, unreadableReason: string | null): boolean {
    const folder = this.folders[kind].get(folderId);
    if (!folder) return false;
    const issue: DefinitionLoadIssue = Object.freeze({
      code: "DEFINITION_SOURCE_UNAVAILABLE",
      reason: unreadableReason
        ? `The package folder '${folder.location.packageRoot}' could not be read (${unreadableReason}); the last loaded version is kept until it can be read again.`
        : `The package folder '${folder.location.packageRoot}' is missing; the last loaded version is kept until it returns.`,
      definitionPath: folder.location.folderDir,
      packageRoot: folder.location.packageRoot,
    });
    if (sameIssue(folder.root.issue, issue)) return false;
    folder.root = { ...folder.root, issue };
    return true;
  }

  remove(kind: AgentPackageDefinitionKind, folderId: string): boolean {
    const folder = this.folders[kind].get(folderId);
    if (!folder) return false;
    this.unindex(folder);
    this.folders[kind].delete(folderId);
    return true;
  }

  folderIds(kind: AgentPackageDefinitionKind): string[] {
    return [...this.folders[kind].keys()];
  }

  folderLocation(kind: AgentPackageDefinitionKind, folderId: string): DefinitionFolderLocation | null {
    return this.folders[kind].get(folderId)?.location ?? null;
  }

  /** A copy of the folder's last working root definition, if any. */
  folderRootDefinition<K extends AgentPackageDefinitionKind>(kind: K, folderId: string): DefinitionByKind[K] | null {
    const definition = this.folders[kind].get(folderId)?.root.definition ?? null;
    return definition ? cloneValue(definition as DefinitionByKind[K]) : null;
  }

  /** The definition folder that holds a definition: its own folder, or the folder it is nested in. */
  folderOf(kind: AgentPackageDefinitionKind, id: string): DefinitionFolderRef | null {
    return this.folderIndex.get(definitionKey(kind, id)) ?? null;
  }

  getEntry<K extends AgentPackageDefinitionKind>(kind: K, id: string): AgentPackageDefinitionEntry<K> | null {
    const ref = this.folderIndex.get(definitionKey(kind, id));
    if (!ref) return null;
    const folder = this.folders[ref.kind].get(ref.folderId);
    if (!folder) return null;
    const stored = folder.root.kind === kind && folder.root.id === id ? folder.root : folder.nested.get(id);
    return stored ? this.toEntry(folder, stored) as AgentPackageDefinitionEntry<K> : null;
  }

  getDefinition<K extends AgentPackageDefinitionKind>(kind: K, id: string): DefinitionByKind[K] | null {
    return this.getEntry(kind, id)?.definition ?? null;
  }

  /** The own definition of every definition folder of a kind, in reload order. */
  listFolderRoots<K extends AgentPackageDefinitionKind>(kind: K): AgentPackageDefinitionEntry<K>[] {
    return [...this.folders[kind].values()].map((folder) => this.toEntry(folder, folder.root) as AgentPackageDefinitionEntry<K>);
  }

  /** The nested definitions of `nestedKind` held by definition folders of `folderKind`. */
  listNestedDefinitions<K extends AgentPackageDefinitionKind>(folderKind: AgentPackageDefinitionKind, nestedKind: K): AgentPackageDefinitionEntry<K>[] {
    const output: AgentPackageDefinitionEntry<K>[] = [];
    for (const folder of this.folders[folderKind].values()) {
      for (const stored of folder.nested.values()) {
        if (stored.kind === nestedKind) output.push(this.toEntry(folder, stored) as AgentPackageDefinitionEntry<K>);
      }
    }
    return output;
  }

  /** Every definition of a kind (own and nested) that has a load issue. */
  listLoadIssueEntries<K extends AgentPackageDefinitionKind>(kind: K): AgentPackageDefinitionEntry<K>[] {
    const output: AgentPackageDefinitionEntry<K>[] = [];
    for (const folders of Object.values(this.folders)) {
      for (const folder of folders.values()) {
        for (const stored of [folder.root, ...folder.nested.values()]) {
          if (stored.kind === kind && stored.issue) output.push(this.toEntry(folder, stored) as AgentPackageDefinitionEntry<K>);
        }
      }
    }
    return output;
  }

  /**
   * Every load issue of each definition folder of `folderKind`, keyed by folder ID: the folder's
   * own definition first, then nested definitions in path order. Folders without issues are absent.
   */
  listFolderLoadIssues(folderKind: AgentPackageDefinitionKind): Map<string, DefinitionLoadIssueEntry[]> {
    const output = new Map<string, DefinitionLoadIssueEntry[]>();
    for (const folder of this.folders[folderKind].values()) {
      const issues = this.loadIssuesOf(folder);
      if (issues.length > 0) output.set(folder.folderId, issues);
    }
    return output;
  }

  /** The load issues of one definition folder (own definition first, then nested in path order); empty when clean or unknown. */
  getFolderLoadIssues(folderKind: AgentPackageDefinitionKind, folderId: string): DefinitionLoadIssueEntry[] {
    const folder = this.folders[folderKind].get(folderId);
    return folder ? this.loadIssuesOf(folder) : [];
  }

  private loadIssuesOf(folder: StoredDefinitionFolder): DefinitionLoadIssueEntry[] {
    return [folder.root, ...folder.nested.values()].flatMap((stored) => stored.issue
      ? [Object.freeze({
          kind: stored.kind,
          definitionId: stored.id,
          name: stored.definition?.name ?? null,
          issue: stored.issue,
          usingLastGood: stored.definition !== null,
        })]
      : []);
  }

  private applyDefinition(
    previous: StoredDefinition | undefined,
    id: string,
    next: KindDefinitionReadResult,
    location: DefinitionFolderLocation,
  ): { stored: StoredDefinition | null; changed: boolean } {
    const result = next.result as DefinitionReadResult<AnyDefinition>;
    const prior = previous?.kind === next.kind ? previous : undefined;
    if (result.status === "absent") return { stored: null, changed: Boolean(previous) };
    if (result.status === "valid") {
      return {
        stored: { kind: next.kind, id, definition: result.definition, fingerprint: result.fingerprint, issue: null },
        changed: !prior || prior.definition === null || prior.fingerprint !== result.fingerprint || prior.issue !== null,
      };
    }
    const issue: DefinitionLoadIssue = Object.freeze({
      code: result.code,
      reason: result.reason,
      definitionPath: result.definitionPath,
      packageRoot: location.packageRoot,
    });
    // A duplicated identity is a contract conflict, not a broken edit: no last good applies.
    const keepLastGood = result.code !== "DEFINITION_IDENTITY_DUPLICATED";
    const definition = keepLastGood ? prior?.definition ?? null : null;
    return {
      stored: { kind: next.kind, id, definition, fingerprint: keepLastGood ? prior?.fingerprint ?? null : null, issue },
      changed: !prior || !sameIssue(prior.issue, issue) || (prior.definition !== null && definition === null),
    };
  }

  private toEntry(folder: StoredDefinitionFolder, stored: StoredDefinition): AgentPackageDefinitionEntry<AgentPackageDefinitionKind> {
    return Object.freeze({
      kind: stored.kind,
      id: stored.id,
      definition: stored.definition ? cloneValue(stored.definition) : null,
      issue: stored.issue,
      location: folder.location,
      folder: Object.freeze({ kind: folder.kind, folderId: folder.folderId }),
      isFolderRoot: stored === folder.root,
    });
  }

  private index(folder: StoredDefinitionFolder): void {
    const ref = Object.freeze({ kind: folder.kind, folderId: folder.folderId });
    this.folderIndex.set(definitionKey(folder.root.kind, folder.root.id), ref);
    for (const stored of folder.nested.values()) this.folderIndex.set(definitionKey(stored.kind, stored.id), ref);
  }

  private unindex(folder: StoredDefinitionFolder): void {
    for (const stored of [folder.root, ...folder.nested.values()]) {
      const key = definitionKey(stored.kind, stored.id);
      const ref = this.folderIndex.get(key);
      if (ref?.kind === folder.kind && ref.folderId === folder.folderId) this.folderIndex.delete(key);
    }
  }
}
