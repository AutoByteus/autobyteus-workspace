import type {
  DefinitionBySubject,
  DefinitionCatalogIssue,
  DefinitionSubject,
  DefinitionUnitLocation,
  NodeReadOutcome,
  SubjectNodeOutcome,
  UnitReadOutcome,
} from "../domain/definition-catalog-types.js";

type CatalogDefinition = DefinitionBySubject[DefinitionSubject];

type CatalogNode = {
  subject: DefinitionSubject;
  id: string;
  definition: CatalogDefinition | null;
  fingerprint: string | null;
  issue: DefinitionCatalogIssue | null;
};

type CatalogUnit = {
  subject: DefinitionSubject;
  unitId: string;
  location: DefinitionUnitLocation;
  root: CatalogNode;
  children: Map<string, CatalogNode>;
};

export type DefinitionUnitRef = Readonly<{ subject: DefinitionSubject; unitId: string }>;

/** A read-only view of one catalog node; `definition` is a copy owned by the caller. */
export type DefinitionCatalogEntry<S extends DefinitionSubject> = Readonly<{
  subject: S;
  id: string;
  definition: DefinitionBySubject[S] | null;
  issue: DefinitionCatalogIssue | null;
  location: DefinitionUnitLocation;
  unit: DefinitionUnitRef;
  isUnitRoot: boolean;
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

const sameIssue = (left: DefinitionCatalogIssue | null, right: DefinitionCatalogIssue | null): boolean =>
  left === right || (left !== null && right !== null
    && left.code === right.code
    && left.reason === right.reason
    && left.definitionPath === right.definitionPath
    && left.packageRoot === right.packageRoot);

const nodeKey = (subject: DefinitionSubject, id: string): string => `${subject}\u0000${id}`;

/**
 * The in-memory inventory of definitions from registered package roots (plus application-owned
 * list entries). It applies the last-good reconcile rule per node and never performs I/O.
 * `DefinitionCatalogSync` is its only writer; every read returns copies.
 */
export class DefinitionCatalog {
  private readonly units: Record<DefinitionSubject, Map<string, CatalogUnit>> = {
    agent: new Map(),
    agent_team: new Map(),
    agent_org: new Map(),
  };
  private readonly nodeIndex = new Map<string, DefinitionUnitRef>();

  /** Applies one unit read. Returns whether anything a reader can observe changed. */
  apply(subject: DefinitionSubject, unitId: string, outcome: UnitReadOutcome): boolean {
    if (outcome.kind === "absent") return this.remove(subject, unitId);
    const previous = this.units[subject].get(unitId) ?? null;
    const rootResult = this.applyNode(previous?.root, unitId, outcome.root, outcome.location);
    if (!rootResult.node) return this.remove(subject, unitId);

    let changed = rootResult.changed
      || !previous
      || previous.location.unitDir !== outcome.location.unitDir
      || previous.location.packageRoot !== outcome.location.packageRoot;
    let children: Map<string, CatalogNode>;
    if (outcome.children === null) {
      children = previous?.children ?? new Map();
    } else {
      children = new Map();
      const ids = new Set<string>([...(previous?.children.keys() ?? []), ...outcome.children.keys()]);
      for (const id of ids) {
        const next = outcome.children.get(id);
        const result = next
          ? this.applyNode(previous?.children.get(id), id, next, outcome.location)
          : { node: null, changed: previous?.children.has(id) ?? false };
        if (result.node) children.set(id, result.node);
        changed ||= result.changed;
      }
    }

    if (previous) this.unindex(previous);
    const unit: CatalogUnit = { subject, unitId, location: outcome.location, root: rootResult.node, children };
    this.units[subject].set(unitId, unit);
    this.index(unit);
    return changed;
  }

  /** Keeps the whole unit (last good) and records that its package folder is missing. */
  markSourceMissing(subject: DefinitionSubject, unitId: string): boolean {
    const unit = this.units[subject].get(unitId);
    if (!unit) return false;
    const issue: DefinitionCatalogIssue = Object.freeze({
      code: "DEFINITION_SOURCE_MISSING",
      reason: `The package folder '${unit.location.packageRoot}' is missing; the last loaded version is kept until it returns.`,
      definitionPath: unit.location.unitDir,
      packageRoot: unit.location.packageRoot,
    });
    if (sameIssue(unit.root.issue, issue)) return false;
    unit.root = { ...unit.root, issue };
    return true;
  }

  remove(subject: DefinitionSubject, unitId: string): boolean {
    const unit = this.units[subject].get(unitId);
    if (!unit) return false;
    this.unindex(unit);
    this.units[subject].delete(unitId);
    return true;
  }

  unitIds(subject: DefinitionSubject): string[] {
    return [...this.units[subject].keys()];
  }

  unitLocation(subject: DefinitionSubject, unitId: string): DefinitionUnitLocation | null {
    return this.units[subject].get(unitId)?.location ?? null;
  }

  /** A copy of the unit's last good root definition, if any. */
  unitRootDefinition<S extends DefinitionSubject>(subject: S, unitId: string): DefinitionBySubject[S] | null {
    const definition = this.units[subject].get(unitId)?.root.definition ?? null;
    return definition ? cloneValue(definition as DefinitionBySubject[S]) : null;
  }

  /** The unit that owns a node: the unit itself for a root node, its parent unit for a nested node. */
  unitOf(subject: DefinitionSubject, id: string): DefinitionUnitRef | null {
    return this.nodeIndex.get(nodeKey(subject, id)) ?? null;
  }

  getEntry<S extends DefinitionSubject>(subject: S, id: string): DefinitionCatalogEntry<S> | null {
    const ref = this.nodeIndex.get(nodeKey(subject, id));
    if (!ref) return null;
    const unit = this.units[ref.subject].get(ref.unitId);
    if (!unit) return null;
    const node = unit.root.subject === subject && unit.root.id === id ? unit.root : unit.children.get(id);
    return node ? this.toEntry(unit, node) as DefinitionCatalogEntry<S> : null;
  }

  getDefinition<S extends DefinitionSubject>(subject: S, id: string): DefinitionBySubject[S] | null {
    return this.getEntry(subject, id)?.definition ?? null;
  }

  /** The root node of every unit of a subject, in reconcile order. */
  listUnitRoots<S extends DefinitionSubject>(subject: S): DefinitionCatalogEntry<S>[] {
    return [...this.units[subject].values()].map((unit) => this.toEntry(unit, unit.root) as DefinitionCatalogEntry<S>);
  }

  /** The nested nodes of one subject held by units of `unitSubject`. */
  listNestedNodes<S extends DefinitionSubject>(unitSubject: DefinitionSubject, nodeSubject: S): DefinitionCatalogEntry<S>[] {
    const output: DefinitionCatalogEntry<S>[] = [];
    for (const unit of this.units[unitSubject].values()) {
      for (const node of unit.children.values()) {
        if (node.subject === nodeSubject) output.push(this.toEntry(unit, node) as DefinitionCatalogEntry<S>);
      }
    }
    return output;
  }

  /** Every node of a subject (roots and nested) that carries an issue. */
  listIssueEntries<S extends DefinitionSubject>(subject: S): DefinitionCatalogEntry<S>[] {
    const output: DefinitionCatalogEntry<S>[] = [];
    for (const units of Object.values(this.units)) {
      for (const unit of units.values()) {
        for (const node of [unit.root, ...unit.children.values()]) {
          if (node.subject === subject && node.issue) output.push(this.toEntry(unit, node) as DefinitionCatalogEntry<S>);
        }
      }
    }
    return output;
  }

  private applyNode(
    previous: CatalogNode | undefined,
    id: string,
    next: SubjectNodeOutcome,
    location: DefinitionUnitLocation,
  ): { node: CatalogNode | null; changed: boolean } {
    const outcome = next.outcome as NodeReadOutcome<CatalogDefinition>;
    const sameSubject = previous?.subject === next.subject;
    const prior = sameSubject ? previous : undefined;
    if (outcome.kind === "absent") return { node: null, changed: Boolean(previous) };
    if (outcome.kind === "valid") {
      return {
        node: { subject: next.subject, id, definition: outcome.definition, fingerprint: outcome.fingerprint, issue: null },
        changed: !prior || prior.definition === null || prior.fingerprint !== outcome.fingerprint || prior.issue !== null,
      };
    }
    const issue: DefinitionCatalogIssue = Object.freeze({
      code: outcome.code,
      reason: outcome.reason,
      definitionPath: outcome.definitionPath,
      packageRoot: location.packageRoot,
    });
    // A duplicated identity is a contract conflict, not a broken edit: no last good applies.
    const keepLastGood = outcome.code !== "DEFINITION_IDENTITY_DUPLICATED";
    const definition = keepLastGood ? prior?.definition ?? null : null;
    return {
      node: { subject: next.subject, id, definition, fingerprint: keepLastGood ? prior?.fingerprint ?? null : null, issue },
      changed: !prior || !sameIssue(prior.issue, issue) || (prior.definition !== null && definition === null),
    };
  }

  private toEntry(unit: CatalogUnit, node: CatalogNode): DefinitionCatalogEntry<DefinitionSubject> {
    return Object.freeze({
      subject: node.subject,
      id: node.id,
      definition: node.definition ? cloneValue(node.definition) : null,
      issue: node.issue,
      location: unit.location,
      unit: Object.freeze({ subject: unit.subject, unitId: unit.unitId }),
      isUnitRoot: node === unit.root,
    });
  }

  private index(unit: CatalogUnit): void {
    const ref = Object.freeze({ subject: unit.subject, unitId: unit.unitId });
    this.nodeIndex.set(nodeKey(unit.root.subject, unit.root.id), ref);
    for (const node of unit.children.values()) this.nodeIndex.set(nodeKey(node.subject, node.id), ref);
  }

  private unindex(unit: CatalogUnit): void {
    for (const node of [unit.root, ...unit.children.values()]) {
      const key = nodeKey(node.subject, node.id);
      const ref = this.nodeIndex.get(key);
      if (ref?.subject === unit.subject && ref.unitId === unit.unitId) this.nodeIndex.delete(key);
    }
  }
}
