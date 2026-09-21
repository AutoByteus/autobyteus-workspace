import path from "node:path";

export type DefinitionSourceClass =
  | "server_data"
  | "implementation_repository"
  | "external_read_only";

export type DefinitionMutationOwner =
  | "server_definition_migration_and_provider"
  | "implementation_change"
  | "external_project";

export type DefinitionSourceDescriptor = Readonly<{
  sourceClass: DefinitionSourceClass;
  mutationOwner: DefinitionMutationOwner;
  packageRoot: string;
  definitionPath: string;
}>;

export const createDefinitionSourceDescriptor = (input: {
  sourceClass: DefinitionSourceClass;
  packageRoot: string;
  definitionPath: string;
}): DefinitionSourceDescriptor => {
  const packageRoot = path.resolve(input.packageRoot);
  const definitionPath = path.resolve(input.definitionPath);
  if (definitionPath !== packageRoot && !definitionPath.startsWith(`${packageRoot}${path.sep}`)) {
    throw new Error("Definition path must be contained by its registered package root.");
  }
  const mutationOwner: DefinitionMutationOwner = input.sourceClass === "server_data"
    ? "server_definition_migration_and_provider"
    : input.sourceClass === "implementation_repository"
      ? "implementation_change"
      : "external_project";
  return Object.freeze({
    sourceClass: input.sourceClass,
    mutationOwner,
    packageRoot,
    definitionPath,
  });
};

export const assertDefinitionSourceWritableByRuntime = (
  source: DefinitionSourceDescriptor,
): void => {
  if (
    source.sourceClass !== "server_data"
    || source.mutationOwner !== "server_definition_migration_and_provider"
  ) {
    throw new Error(
      `Definition source '${source.definitionPath}' is ${source.sourceClass} and cannot be written by the server runtime.`,
    );
  }
};
