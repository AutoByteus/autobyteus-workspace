import type { FileSystemChangeEvent } from "~/types/fileSystemChangeTypes";

export const STRUCTURAL_ECHO_TTL_MS = 5000;

export type RecentStructuralChangeEcho = {
  signature: string;
  expiresAt: number;
};

type StructuralChange = Exclude<FileSystemChangeEvent["changes"][number], { type: "modify" }>;

export const remapPrefixedPath = (value: string, oldPrefix: string, newPrefix: string): string => {
  if (value === oldPrefix) {
    return newPrefix;
  }
  if (value.startsWith(`${oldPrefix}/`)) {
    return `${newPrefix}${value.slice(oldPrefix.length)}`;
  }
  return value;
};

export const remapOpenFolderPaths = (
  openFolders: Record<string, boolean>,
  oldPrefix: string,
  newPrefix: string,
): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(openFolders).map(([folderPath, isOpen]) => [
      remapPrefixedPath(folderPath, oldPrefix, newPrefix),
      isOpen,
    ]),
  );

export const remapOpenFilePaths = <T extends { path: string }>(
  openFiles: T[],
  oldPrefix: string,
  newPrefix: string,
): T[] =>
  openFiles.map((file) => ({
    ...file,
    path: remapPrefixedPath(file.path, oldPrefix, newPrefix),
  }));

export const createStructuralChangeSignature = (change: StructuralChange): string => {
  switch (change.type) {
    case "add":
      return `add:${change.parent_id}:${change.node.id}:${change.node.path}`;
    case "delete":
      return `delete:${change.parent_id}:${change.node_id}`;
    case "rename":
      return `rename:${change.parent_id}:${change.node.id}:${change.node.path}`;
    case "move":
      return `move:${change.old_parent_id}:${change.new_parent_id}:${change.node.id}:${change.node.path}`;
  }
};

export const recordRecentStructuralChangeEchoes = (
  existingEchoes: RecentStructuralChangeEcho[],
  event: FileSystemChangeEvent,
  now = Date.now(),
): RecentStructuralChangeEcho[] => {
  const nextEchoes = existingEchoes.filter((entry) => entry.expiresAt > now);

  for (const change of event.changes) {
    if (change.type === "modify") {
      continue;
    }
    nextEchoes.push({
      signature: createStructuralChangeSignature(change),
      expiresAt: now + STRUCTURAL_ECHO_TTL_MS,
    });
  }

  return nextEchoes;
};

export const consumeRecentStructuralChangeEchoes = (
  existingEchoes: RecentStructuralChangeEcho[],
  event: FileSystemChangeEvent,
  now = Date.now(),
): {
  remainingEchoes: RecentStructuralChangeEcho[];
  filteredEvent: FileSystemChangeEvent;
} => {
  const remainingEchoes = (existingEchoes ?? []).filter((entry) => entry.expiresAt > now);
  const availableEchoes = [...remainingEchoes];
  const filteredChanges = event.changes.filter((change) => {
    if (change.type === "modify") {
      return true;
    }
    const signature = createStructuralChangeSignature(change);
    const matchIndex = availableEchoes.findIndex((entry) => entry.signature === signature);
    if (matchIndex === -1) {
      return true;
    }
    availableEchoes.splice(matchIndex, 1);
    return false;
  });

  return {
    remainingEchoes: availableEchoes,
    filteredEvent: { changes: filteredChanges },
  };
};
