export const FEATURED_CATALOG_ITEMS_SETTING_KEY = "AUTOBYTEUS_FEATURED_CATALOG_ITEMS";

export const FEATURED_CATALOG_RESOURCE_KINDS = ["AGENT", "AGENT_TEAM"] as const;

export type FeaturedCatalogResourceKind = (typeof FEATURED_CATALOG_RESOURCE_KINDS)[number];

export interface FeaturedCatalogItem {
  resourceKind: FeaturedCatalogResourceKind;
  definitionId: string;
  sortOrder: number;
}

export interface FeaturedCatalogItemsSetting {
  version: 1;
  items: FeaturedCatalogItem[];
}

export type FeaturedCatalogItemsParseOptions = {
  rejectDuplicates?: boolean;
};

export type FeaturedCatalogItemsParseResult =
  | { ok: true; setting: FeaturedCatalogItemsSetting }
  | { ok: false; error: string };

const FEATURED_CATALOG_SETTING_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isResourceKind = (value: unknown): value is FeaturedCatalogResourceKind =>
  value === "AGENT" || value === "AGENT_TEAM";

const normalizeSortOrder = (value: unknown, index: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return (index + 1) * 10;
};

const identityKey = (item: Pick<FeaturedCatalogItem, "resourceKind" | "definitionId">): string =>
  `${item.resourceKind}:${item.definitionId}`;

const sortItems = (items: FeaturedCatalogItem[]): FeaturedCatalogItem[] =>
  items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      if (left.item.sortOrder !== right.item.sortOrder) {
        return left.item.sortOrder - right.item.sortOrder;
      }
      return left.index - right.index;
    })
    .map(({ item }) => item);

export const createFeaturedCatalogItemsSetting = (
  items: FeaturedCatalogItem[],
): FeaturedCatalogItemsSetting => ({
  version: FEATURED_CATALOG_SETTING_VERSION,
  items: sortItems(items.map((item, index) => ({
    resourceKind: item.resourceKind,
    definitionId: item.definitionId.trim(),
    sortOrder: normalizeSortOrder(item.sortOrder, index),
  }))),
});

export const createDefaultFeaturedCatalogItemsSetting = (
  agentDefinitionId: string,
): FeaturedCatalogItemsSetting =>
  createFeaturedCatalogItemsSetting([
    {
      resourceKind: "AGENT",
      definitionId: agentDefinitionId,
      sortOrder: 10,
    },
  ]);

export const parseFeaturedCatalogItemsSetting = (
  rawValue: string | null | undefined,
  options: FeaturedCatalogItemsParseOptions = {},
): FeaturedCatalogItemsParseResult => {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return { ok: false, error: "Featured catalog setting must be a non-empty JSON object." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    return { ok: false, error: `Featured catalog setting must be valid JSON: ${String(error)}` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Featured catalog setting must be a JSON object." };
  }

  if (parsed.version !== FEATURED_CATALOG_SETTING_VERSION) {
    return { ok: false, error: "Featured catalog setting version must be 1." };
  }

  if (!Array.isArray(parsed.items)) {
    return { ok: false, error: "Featured catalog setting items must be an array." };
  }

  const seenIdentities = new Set<string>();
  const items: FeaturedCatalogItem[] = [];

  for (const [index, rawItem] of parsed.items.entries()) {
    if (!isRecord(rawItem)) {
      return { ok: false, error: `Featured catalog item ${index + 1} must be an object.` };
    }

    if (!isResourceKind(rawItem.resourceKind)) {
      return {
        ok: false,
        error: `Featured catalog item ${index + 1} must use resourceKind AGENT or AGENT_TEAM.`,
      };
    }

    if (typeof rawItem.definitionId !== "string" || rawItem.definitionId.trim().length === 0) {
      return {
        ok: false,
        error: `Featured catalog item ${index + 1} must include a non-empty definitionId.`,
      };
    }

    const item: FeaturedCatalogItem = {
      resourceKind: rawItem.resourceKind,
      definitionId: rawItem.definitionId.trim(),
      sortOrder: normalizeSortOrder(rawItem.sortOrder, index),
    };
    const key = identityKey(item);

    if (seenIdentities.has(key)) {
      if (options.rejectDuplicates) {
        return {
          ok: false,
          error: `Featured catalog item '${item.resourceKind}:${item.definitionId}' is duplicated.`,
        };
      }
      continue;
    }

    seenIdentities.add(key);
    items.push(item);
  }

  return {
    ok: true,
    setting: {
      version: FEATURED_CATALOG_SETTING_VERSION,
      items: sortItems(items),
    },
  };
};

export const serializeFeaturedCatalogItemsSetting = (
  setting: FeaturedCatalogItemsSetting,
): string => JSON.stringify(createFeaturedCatalogItemsSetting(setting.items));

export const normalizeFeaturedCatalogItemsSettingForPersistence = (
  rawValue: string,
): [true, string] | [false, string] => {
  const result = parseFeaturedCatalogItemsSetting(rawValue, { rejectDuplicates: true });
  if (!result.ok) {
    return [false, result.error];
  }

  return [true, serializeFeaturedCatalogItemsSetting(result.setting)];
};
