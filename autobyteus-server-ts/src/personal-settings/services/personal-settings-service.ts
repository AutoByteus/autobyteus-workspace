import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { BUILT_IN_AGENT_DEFINITIONS } from "../../built-in-agents/built-in-agent-registry.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import type {
  AgentPackageDefinitionKind,
  DefinitionByKind,
  RegisteredPackageRoot,
} from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import {
  listsAffectedBy,
  type AgentPackageDefinitionChangePublisher,
} from "../../agent-package-definitions/services/agent-package-definition-reloader.js";
import {
  FIELDS_OF_SETTING,
  isPersonalLaunchConfig,
  isSettingName,
  personalSettingKey,
  sameRecord,
  settingsOfKind,
  toRecord,
  type PersonalLaunchConfig,
  type PersonalSetting,
  type PersonalSettingRecord,
  type PersonalSettingsBase,
} from "../domain/personal-setting-record.js";
import { PersonalSettingsStore } from "../stores/personal-settings-store.js";

/** Where a definition was read from (the store entry's source class). */
export type PersonalSettingsSourceClass = RegisteredPackageRoot["sourceClass"];

/** The four settings of a definition's base value (tools and skills only for agents). */
export type PersonalSettingValues = Readonly<{
  toolNames?: readonly string[];
  skillNames?: readonly string[];
  avatarUrl?: string | null;
  defaultLaunchConfig: DefaultLaunchConfig | null;
}>;

/** The four settings as the editor sent them; an absent field leaves that personal setting as it is. */
export type PersonalSettingEdits = Readonly<{
  toolNames?: readonly string[];
  skillNames?: readonly string[];
  avatarUrl?: string | null;
  defaultLaunchConfig?: DefaultLaunchConfig | null;
}>;

/** One definition's four settings in the installed revision and in the files on disk (contract §7.2). */
export type PackageEdit = Readonly<{
  kind: AgentPackageDefinitionKind;
  definitionId: string;
  installed: PersonalSettingValues;
  onDisk: PersonalSettingValues;
}>;

/** What the editor shows: the base the settings sit on (null: personal settings do not apply), and which are personal. */
export type PersonalSettingsView = Readonly<{ base: PersonalSettingsBase | null; settings: readonly PersonalSetting[] }>;

const BUILT_IN_AGENT_IDS: ReadonlySet<string> = new Set(BUILT_IN_AGENT_DEFINITIONS.map((definition) => definition.id));
const LISTS = [["toolNames", "toolsAdded", "toolsRemoved"], ["skillNames", "skillsAdded", "skillsRemoved"]] as const;

const uniqueNames = (names: readonly string[] | undefined): string[] => [...new Set((names ?? []).filter(isSettingName))];

/** The base list minus the removed names, then the added names not already present (contract §5). */
const effectiveList = (base: readonly string[], added: readonly string[] = [], removed: readonly string[] = []): string[] => {
  const kept = base.filter((name) => !removed.includes(name));
  return [...kept, ...added.filter((name) => !kept.includes(name))];
};

/** A launch config that names both runtime and model, as a personal value; null otherwise (contract §3.2). */
const toPersonalLaunchConfig = (value: DefaultLaunchConfig | null | undefined): PersonalLaunchConfig | null => {
  const candidate = value && value.runtimeKind && value.llmModelIdentifier
    ? { runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier, llmConfig: value.llmConfig ? structuredClone(value.llmConfig) : null }
    : null;
  return isPersonalLaunchConfig(candidate) ? candidate : null;
};

const sameLaunchConfig = (left: DefaultLaunchConfig | null, right: DefaultLaunchConfig | null): boolean =>
  JSON.stringify([left?.runtimeKind ?? null, left?.llmModelIdentifier ?? null, left?.llmConfig ?? null])
  === JSON.stringify([right?.runtimeKind ?? null, right?.llmModelIdentifier ?? null, right?.llmConfig ?? null]);

/** A shallow copy that keeps the definition's class. */
const copyDefinition = <T extends object>(definition: T): T =>
  Object.assign(Object.create(Object.getPrototypeOf(definition) as object) as T, definition);

/**
 * The node's personal settings (personal-settings-file-contract.md): the user's own tools, skills,
 * avatar and runtime/model for definitions from agent packages and for built-in agents, kept outside
 * their files and applied on top of the base value when a definition is read. The only reader and
 * writer of the personal settings file; a change is announced through the publisher set on it.
 */
export class PersonalSettingsService {
  private static bound: PersonalSettingsService | null = null;
  private static fallback: PersonalSettingsService | null = null;

  /**
   * The process instance the host bound; before (or without) a host, one over the process app-data
   * folder. The fallback never takes the binding, so a service built early cannot block the host.
   */
  static getInstance(): PersonalSettingsService {
    return PersonalSettingsService.bound ?? (PersonalSettingsService.fallback ??= new PersonalSettingsService({
      store: new PersonalSettingsStore(() => personalSettingsFilePath(appConfigProvider.config.getAppDataDir())),
    }));
  }

  static bindProcessInstance(instance: PersonalSettingsService): void {
    if (!instance) throw new Error("A process PersonalSettingsService instance is required.");
    if (PersonalSettingsService.bound) throw new Error("The process PersonalSettingsService is already initialized.");
    PersonalSettingsService.bound = instance;
  }

  static releaseProcessInstance(instance: PersonalSettingsService): void {
    if (PersonalSettingsService.bound === instance) PersonalSettingsService.bound = null;
  }

  private readonly store: PersonalSettingsStore;
  private publisher: AgentPackageDefinitionChangePublisher | null = null;

  constructor(options: { store: PersonalSettingsStore }) {
    this.store = options.store;
  }

  /** The feed's announce function (also the reloader's); without one, changes are not announced. */
  setPublisher(publisher: AgentPackageDefinitionChangePublisher | null): void {
    this.publisher = publisher;
  }

  /** Personal settings apply to definitions from registered packages and to built-in agents (contract §8). */
  baseOf(kind: AgentPackageDefinitionKind, definitionId: string, sourceClass: PersonalSettingsSourceClass): PersonalSettingsBase | null {
    if (sourceClass === "registered_package") return "PACKAGE";
    return kind === "agent" && BUILT_IN_AGENT_IDS.has(definitionId) ? "BUILT_IN" : null;
  }

  appliesTo(kind: AgentPackageDefinitionKind, definitionId: string, sourceClass: PersonalSettingsSourceClass): boolean {
    return this.baseOf(kind, definitionId, sourceClass) !== null;
  }

  /** The effective definition (contract §5): a new object, or the definition itself when nothing applies. */
  apply<K extends AgentPackageDefinitionKind>(
    kind: K,
    definition: DefinitionByKind[K],
    sourceClass: PersonalSettingsSourceClass,
  ): DefinitionByKind[K] {
    const id = definition.id;
    if (!id || !this.appliesTo(kind, id, sourceClass)) return definition;
    const record = this.store.get(personalSettingKey(kind, id));
    if (!record) return definition;
    const effective = copyDefinition(definition);
    if (kind === "agent") {
      const agent = effective as DefinitionByKind["agent"];
      agent.toolNames = effectiveList(agent.toolNames, record.toolsAdded, record.toolsRemoved);
      agent.skillNames = effectiveList(agent.skillNames, record.skillsAdded, record.skillsRemoved);
    }
    if (record.avatarUrl !== undefined) effective.avatarUrl = record.avatarUrl;
    if (record.defaultLaunchConfig !== undefined) {
      effective.defaultLaunchConfig = {
        runtimeKind: record.defaultLaunchConfig.runtimeKind,
        llmModelIdentifier: record.defaultLaunchConfig.llmModelIdentifier,
        llmConfig: record.defaultLaunchConfig.llmConfig ? structuredClone(record.defaultLaunchConfig.llmConfig) : null,
      };
    }
    return effective;
  }

  /** The view the editor shows for a definition read from `sourceClass`. */
  viewOf(kind: AgentPackageDefinitionKind, definitionId: string, sourceClass: PersonalSettingsSourceClass): PersonalSettingsView {
    const base = this.baseOf(kind, definitionId, sourceClass);
    return { base, settings: base ? this.personalSettingsOf(kind, definitionId) : [] };
  }

  /** The settings that hold a personal value. */
  personalSettingsOf(kind: AgentPackageDefinitionKind, definitionId: string): PersonalSetting[] {
    const record = this.store.get(personalSettingKey(kind, definitionId));
    if (!record) return [];
    return settingsOfKind(kind).filter((setting) => FIELDS_OF_SETTING[setting].some((field) => record[field] !== undefined));
  }

  /**
   * The editor saved these values (contract §6): lists become additions and removals against the
   * base, a value is kept only when it differs from the base, and an absent value leaves the field
   * as it is. Writes and announces only when the record changed.
   */
  setEdited(kind: AgentPackageDefinitionKind, definitionId: string, base: PersonalSettingValues, edited: PersonalSettingEdits): void {
    const key = personalSettingKey(kind, definitionId);
    const current = this.store.get(key);
    const next: Record<string, unknown> = { ...current };
    if (kind === "agent") {
      for (const [list, added, removed] of LISTS) {
        if (edited[list] === undefined) continue;
        const baseNames = uniqueNames(base[list]);
        const editedNames = uniqueNames(edited[list]);
        next[added] = editedNames.filter((name) => !baseNames.includes(name));
        next[removed] = baseNames.filter((name) => !editedNames.includes(name));
      }
    }
    if (edited.avatarUrl !== undefined) {
      const avatarUrl = edited.avatarUrl?.trim() || null;
      next.avatarUrl = avatarUrl === null || avatarUrl === (base.avatarUrl ?? null) ? undefined : avatarUrl;
    }
    if (edited.defaultLaunchConfig !== undefined) {
      const launch = toPersonalLaunchConfig(edited.defaultLaunchConfig);
      next.defaultLaunchConfig = launch === null || sameLaunchConfig(launch, base.defaultLaunchConfig) ? undefined : launch;
    }
    this.commit(new Map([[key, { kind, current, next: toRecord(next) }]]));
  }

  /** Removes one personal setting ("Reset to the package's setting" / "… the built-in setting"). */
  reset(kind: AgentPackageDefinitionKind, definitionId: string, setting: PersonalSetting): void {
    if (!settingsOfKind(kind).includes(setting)) throw new Error(`The setting ${setting} is not personal for a ${kind}.`);
    const key = personalSettingKey(kind, definitionId);
    const current = this.store.get(key);
    const next: Record<string, unknown> = { ...current };
    for (const field of FIELDS_OF_SETTING[setting]) delete next[field];
    this.commit(new Map([[key, { kind, current, next: toRecord(next) }]]));
  }

  /**
   * Merges edits found in package files at an update into the records (contract §7.2): list
   * differences are added to the record's lists; a different avatar or runtime/model becomes the
   * personal value unless the record already has one. One write and one announce for all edits.
   */
  captureFromPackageEdits(edits: readonly PackageEdit[]): void {
    const changes = new Map<string, { kind: AgentPackageDefinitionKind; current: PersonalSettingRecord | null; next: PersonalSettingRecord | null }>();
    for (const edit of edits) {
      const key = personalSettingKey(edit.kind, edit.definitionId);
      const current = changes.get(key)?.next ?? this.store.get(key);
      const next: Record<string, unknown> = { ...current };
      if (edit.kind === "agent") {
        for (const [list, addedField, removedField] of LISTS) {
          const installed = uniqueNames(edit.installed[list]);
          const onDisk = uniqueNames(edit.onDisk[list]);
          const add = onDisk.filter((name) => !installed.includes(name));
          const remove = installed.filter((name) => !onDisk.includes(name));
          const priorRemoved = (next[removedField] as string[] | undefined) ?? [];
          const added = [...new Set([...((next[addedField] as string[] | undefined) ?? []), ...add])]
            .filter((name) => !priorRemoved.includes(name) || add.includes(name));
          next[addedField] = added;
          next[removedField] = [...new Set([...priorRemoved, ...remove])].filter((name) => !added.includes(name));
        }
      }
      const avatarUrl = edit.onDisk.avatarUrl?.trim() || null;
      if (avatarUrl !== (edit.installed.avatarUrl?.trim() || null) && next.avatarUrl === undefined && avatarUrl) next.avatarUrl = avatarUrl;
      if (!sameLaunchConfig(edit.onDisk.defaultLaunchConfig, edit.installed.defaultLaunchConfig) && next.defaultLaunchConfig === undefined) {
        const launch = toPersonalLaunchConfig(edit.onDisk.defaultLaunchConfig);
        if (launch) next.defaultLaunchConfig = launch;
      }
      changes.set(key, { kind: edit.kind, current: changes.get(key)?.current ?? this.store.get(key), next: toRecord(next) });
    }
    this.commit(changes);
  }

  /** Writes the records that changed, in one write, then announces the lists of their kinds. */
  private commit(changes: ReadonlyMap<string, { kind: AgentPackageDefinitionKind; current: PersonalSettingRecord | null; next: PersonalSettingRecord | null }>): void {
    const changed = [...changes].filter(([, change]) => !sameRecord(change.current, change.next));
    if (changed.length === 0) return;
    this.store.write(new Map(changed.map(([key, change]) => [key, change.next])));
    this.announce(new Set(changed.map(([, change]) => change.kind)));
  }

  private announce(kinds: ReadonlySet<AgentPackageDefinitionKind>): void {
    if (!this.publisher) return;
    try {
      this.publisher(listsAffectedBy(kinds, false));
    } catch (error) {
      console.warn("PERSONAL_SETTINGS_ANNOUNCE_FAILED", error);
    }
  }
}

/** `<app-data>/agent-packages/personal-settings.json` (contract §2). */
export const personalSettingsFilePath = (appDataDir: string): string =>
  path.join(appDataDir, "agent-packages", "personal-settings.json");
