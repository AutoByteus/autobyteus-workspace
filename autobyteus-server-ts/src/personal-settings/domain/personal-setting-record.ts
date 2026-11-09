import {
  AGENT_PACKAGE_DEFINITION_KINDS,
  type AgentPackageDefinitionKind,
} from "../../agent-package-definitions/domain/agent-package-definition-types.js";

/**
 * The records of `<app-data>/agent-packages/personal-settings.json` (personal-settings-file-contract.md
 * §3): one record per definition, keyed `<kind>:<definitionId>`, holding the user's own tools, skills,
 * avatar and runtime/model as differences from the definition's base value.
 */

/** A runtime/model choice that names both, as one unit (contract §3.2). */
export type PersonalLaunchConfig = Readonly<{
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
}>;

export type PersonalSettingRecord = Readonly<{
  toolsAdded?: readonly string[];
  toolsRemoved?: readonly string[];
  skillsAdded?: readonly string[];
  skillsRemoved?: readonly string[];
  avatarUrl?: string;
  defaultLaunchConfig?: PersonalLaunchConfig;
}>;

export type PersonalSettingField = keyof PersonalSettingRecord;

/** The four settings the user sees; one reset removes the record fields of one setting. */
export const PERSONAL_SETTINGS = ["TOOLS", "SKILLS", "AVATAR", "DEFAULT_LAUNCH_CONFIG"] as const;
export type PersonalSetting = (typeof PERSONAL_SETTINGS)[number];

/** Which base the personal settings of a definition sit on: a package's files, or a built-in agent's template. */
export type PersonalSettingsBase = "PACKAGE" | "BUILT_IN";

const LIST_FIELDS = ["toolsAdded", "toolsRemoved", "skillsAdded", "skillsRemoved"] as const;
type ListField = (typeof LIST_FIELDS)[number];

/** Field order in the file. */
const FIELD_ORDER: readonly PersonalSettingField[] = [...LIST_FIELDS, "avatarUrl", "defaultLaunchConfig"];

export const FIELDS_OF_KIND: Readonly<Record<AgentPackageDefinitionKind, readonly PersonalSettingField[]>> = {
  agent: FIELD_ORDER,
  agent_team: ["avatarUrl", "defaultLaunchConfig"],
  agent_org: ["avatarUrl", "defaultLaunchConfig"],
};

export const FIELDS_OF_SETTING: Readonly<Record<PersonalSetting, readonly PersonalSettingField[]>> = {
  TOOLS: ["toolsAdded", "toolsRemoved"],
  SKILLS: ["skillsAdded", "skillsRemoved"],
  AVATAR: ["avatarUrl"],
  DEFAULT_LAUNCH_CONFIG: ["defaultLaunchConfig"],
};

/** The settings a kind can hold: tools and skills are agents' only. */
export const settingsOfKind = (kind: AgentPackageDefinitionKind): readonly PersonalSetting[] =>
  PERSONAL_SETTINGS.filter((setting) => FIELDS_OF_SETTING[setting].every((field) => FIELDS_OF_KIND[kind].includes(field)));

export const personalSettingKey = (kind: AgentPackageDefinitionKind, definitionId: string): string => `${kind}:${definitionId}`;

/** The kind and definition ID of a key, split at the first `:` (IDs may contain `:`); null when either is invalid. */
export const parsePersonalSettingKey = (key: string): Readonly<{ kind: AgentPackageDefinitionKind; definitionId: string }> | null => {
  const separator = key.indexOf(":");
  if (separator < 0) return null;
  const kind = key.slice(0, separator);
  const definitionId = key.slice(separator + 1);
  if (!(AGENT_PACKAGE_DEFINITION_KINDS as readonly string[]).includes(kind) || definitionId.length === 0) return null;
  return { kind: kind as AgentPackageDefinitionKind, definitionId };
};

/** A tool or skill name as AutoByteus stores it: a non-empty string without surrounding whitespace. */
export const isSettingName = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;

const isNameList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isSettingName) && new Set(value).size === value.length;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** A launch config naming both runtime and model, with exactly the three keys (contract §3.2). */
export const isPersonalLaunchConfig = (value: unknown): value is PersonalLaunchConfig =>
  isPlainObject(value)
  && Object.keys(value).sort().join() === "llmConfig,llmModelIdentifier,runtimeKind"
  && typeof value.runtimeKind === "string" && value.runtimeKind.length > 0
  && typeof value.llmModelIdentifier === "string" && value.llmModelIdentifier.length > 0
  && (value.llmConfig === null || isPlainObject(value.llmConfig));

const isValidField = (field: PersonalSettingField, value: unknown): boolean => {
  if ((LIST_FIELDS as readonly string[]).includes(field)) return isNameList(value);
  if (field === "avatarUrl") return typeof value === "string" && value.length > 0;
  return isPersonalLaunchConfig(value);
};

/** The result of reading one record: what applies, and what was skipped (field names, or the record). */
export type PersonalSettingRecordRead = Readonly<{ record: PersonalSettingRecord | null; skipped: readonly string[] }>;

/**
 * Tolerant read of one record (contract §4): unknown or invalid fields are skipped, both lists of a
 * kind are skipped when a name is in both, and a record with nothing valid left is skipped.
 */
export const readPersonalSettingRecord = (kind: AgentPackageDefinitionKind, raw: unknown): PersonalSettingRecordRead => {
  if (!isPlainObject(raw)) return { record: null, skipped: ["<record>"] };
  const kept: Record<string, unknown> = {};
  const skipped: string[] = [];
  for (const [field, value] of Object.entries(raw)) {
    const known = FIELDS_OF_KIND[kind].includes(field as PersonalSettingField);
    if (known && isValidField(field as PersonalSettingField, value)) kept[field] = value;
    else skipped.push(field);
  }
  for (const [added, removed] of [["toolsAdded", "toolsRemoved"], ["skillsAdded", "skillsRemoved"]] as const) {
    const addedNames = kept[added] as string[] | undefined;
    const removedNames = kept[removed] as string[] | undefined;
    if (addedNames && removedNames && addedNames.some((name) => removedNames.includes(name))) {
      delete kept[added];
      delete kept[removed];
      skipped.push(added, removed);
    }
  }
  const record = toRecord(kept);
  return { record, skipped: record ? skipped : [...skipped, "<record>"] };
};

/** A record in file field order, without empty lists; null when nothing is left. */
export const toRecord = (fields: Readonly<Record<string, unknown>>): PersonalSettingRecord | null => {
  const output: Record<string, unknown> = {};
  for (const field of FIELD_ORDER) {
    const value = fields[field];
    if (value === undefined) continue;
    if ((LIST_FIELDS as readonly string[]).includes(field) && (value as readonly string[]).length === 0) continue;
    output[field] = value;
  }
  return Object.keys(output).length > 0 ? output as PersonalSettingRecord : null;
};

export const sameRecord = (left: PersonalSettingRecord | null, right: PersonalSettingRecord | null): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export const isListField = (field: PersonalSettingField): field is ListField => (LIST_FIELDS as readonly string[]).includes(field);
