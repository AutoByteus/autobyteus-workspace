import path from "node:path";

/**
 * Where a definition is read from: the app's own data folder, the implementation repository
 * (built-in, read-only), or a registered agent package (a local folder or a GitHub install). The
 * app writes app data and registered packages; edits to a package go into its folder.
 */
export type DefinitionSourceClass =
  | "server_data"
  | "implementation_repository"
  | "registered_package";

export type DefinitionMutationOwner =
  | "server_definition_migration_and_provider"
  | "implementation_change"
  | "package_author";

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
      : "package_author";
  return Object.freeze({
    sourceClass: input.sourceClass,
    mutationOwner,
    packageRoot,
    definitionPath,
  });
};

/**
 * App data and registered packages are written by the app (as Agents already are); the
 * implementation repository is not. The filesystem check still refuses a folder the disk will not write.
 */
export const assertDefinitionSourceWritableByRuntime = (
  source: DefinitionSourceDescriptor,
): void => {
  if (source.sourceClass === "implementation_repository") {
    throw new Error(
      `Definition source '${source.definitionPath}' is part of the app's implementation and cannot be changed from the app.`,
    );
  }
};
