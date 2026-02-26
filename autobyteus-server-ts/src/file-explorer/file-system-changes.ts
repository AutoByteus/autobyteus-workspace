import { TreeNode, type TreeNodeDict } from "./tree-node.js";

export enum ChangeType {
  ADD = "add",
  DELETE = "delete",
  RENAME = "rename",
  MOVE = "move",
  MODIFY = "modify",
}

const changeTypeValues = new Set(Object.values(ChangeType));

const parseChangeType = (value: string): ChangeType => {
  if (changeTypeValues.has(value as ChangeType)) {
    return value as ChangeType;
  }
  throw new Error(`Unknown ChangeType: ${value}`);
};

export type BaseChangeDict = {
  type: ChangeType;
};

export type AddChangeDict = BaseChangeDict & {
  type: ChangeType.ADD;
  node: TreeNodeDict;
  parent_id: string;
};

export type DeleteChangeDict = BaseChangeDict & {
  type: ChangeType.DELETE;
  node_id: string;
  parent_id: string;
};

export type RenameChangeDict = BaseChangeDict & {
  type: ChangeType.RENAME;
  node: TreeNodeDict;
  parent_id: string;
};

export type MoveChangeDict = BaseChangeDict & {
  type: ChangeType.MOVE;
  node: TreeNodeDict;
  old_parent_id: string;
  new_parent_id: string;
};

export type ModifyChangeDict = BaseChangeDict & {
  type: ChangeType.MODIFY;
  node_id: string;
  parent_id: string;
};

export type FileSystemChangeDict =
  | AddChangeDict
  | DeleteChangeDict
  | RenameChangeDict
  | MoveChangeDict
  | ModifyChangeDict;

export class FileSystemChange {
  type: ChangeType;

  constructor(type: ChangeType) {
    this.type = type;
  }

  toDict(): BaseChangeDict {
    return {
      type: this.type,
    };
  }

  static fromDict(data: { type?: unknown; [key: string]: unknown }): FileSystemChange {
    const changeType = parseChangeType(String(data.type));
    switch (changeType) {
      case ChangeType.ADD:
        return AddChange.fromDict(data as AddChangeDict);
      case ChangeType.DELETE:
        return DeleteChange.fromDict(data as DeleteChangeDict);
      case ChangeType.RENAME:
        return RenameChange.fromDict(data as RenameChangeDict);
      case ChangeType.MOVE:
        return MoveChange.fromDict(data as MoveChangeDict);
      case ChangeType.MODIFY:
        return ModifyChange.fromDict(data as ModifyChangeDict);
      default:
        throw new Error(`Unknown ChangeType: ${changeType}`);
    }
  }
}

export class AddChange extends FileSystemChange {
  node: TreeNode;
  parentId: string;

  constructor(node: TreeNode, parentId: string) {
    super(ChangeType.ADD);
    this.node = node;
    this.parentId = parentId;
  }

  private nodeToDict(node: TreeNode): TreeNodeDict {
    return {
      name: node.name,
      path: node.getPath(),
      is_file: node.isFile,
      id: node.id,
      children: [],
    };
  }

  override toDict(): AddChangeDict {
    return {
      ...super.toDict(),
      type: ChangeType.ADD,
      node: this.nodeToDict(this.node),
      parent_id: this.parentId,
    };
  }

  static fromDict(data: AddChangeDict): AddChange {
    const node = TreeNode.fromDict(data.node);
    return new AddChange(node, data.parent_id);
  }
}

export class DeleteChange extends FileSystemChange {
  nodeId: string;
  parentId: string;

  constructor(nodeId: string, parentId: string) {
    super(ChangeType.DELETE);
    this.nodeId = nodeId;
    this.parentId = parentId;
  }

  override toDict(): DeleteChangeDict {
    return {
      ...super.toDict(),
      type: ChangeType.DELETE,
      node_id: this.nodeId,
      parent_id: this.parentId,
    };
  }

  static fromDict(data: DeleteChangeDict): DeleteChange {
    return new DeleteChange(data.node_id, data.parent_id);
  }
}

export class RenameChange extends FileSystemChange {
  node: TreeNode;
  parentId: string;

  constructor(node: TreeNode, parentId: string) {
    super(ChangeType.RENAME);
    this.node = node;
    this.parentId = parentId;
  }

  override toDict(): RenameChangeDict {
    return {
      ...super.toDict(),
      type: ChangeType.RENAME,
      node: this.node.toDict(),
      parent_id: this.parentId,
    };
  }

  static fromDict(data: RenameChangeDict): RenameChange {
    const node = TreeNode.fromDict(data.node);
    return new RenameChange(node, data.parent_id);
  }
}

export class MoveChange extends FileSystemChange {
  node: TreeNode;
  oldParentId: string;
  newParentId: string;

  constructor(node: TreeNode, oldParentId: string, newParentId: string) {
    super(ChangeType.MOVE);
    this.node = node;
    this.oldParentId = oldParentId;
    this.newParentId = newParentId;
  }

  override toDict(): MoveChangeDict {
    return {
      ...super.toDict(),
      type: ChangeType.MOVE,
      node: this.node.toDict(),
      old_parent_id: this.oldParentId,
      new_parent_id: this.newParentId,
    };
  }

  static fromDict(data: MoveChangeDict): MoveChange {
    const node = TreeNode.fromDict(data.node);
    return new MoveChange(node, data.old_parent_id, data.new_parent_id);
  }
}

export class ModifyChange extends FileSystemChange {
  nodeId: string;
  parentId: string;

  constructor(nodeId: string, parentId: string) {
    super(ChangeType.MODIFY);
    this.nodeId = nodeId;
    this.parentId = parentId;
  }

  override toDict(): ModifyChangeDict {
    return {
      ...super.toDict(),
      type: ChangeType.MODIFY,
      node_id: this.nodeId,
      parent_id: this.parentId,
    };
  }

  static fromDict(data: ModifyChangeDict): ModifyChange {
    return new ModifyChange(data.node_id, data.parent_id);
  }
}

export class FileSystemChangeEvent {
  changes: FileSystemChange[];

  constructor(changes: FileSystemChange[] = []) {
    this.changes = changes;
  }

  toDict(): { changes: FileSystemChangeDict[] } {
    return {
      changes: this.changes.map((change) => change.toDict() as FileSystemChangeDict),
    };
  }

  static fromDict(data: { changes: FileSystemChangeDict[] }): FileSystemChangeEvent {
    const changes = (data.changes ?? []).map((changeData) => FileSystemChange.fromDict(changeData));
    return new FileSystemChangeEvent(changes);
  }

  toJson(): string {
    return JSON.stringify(this.toDict());
  }

  static fromJson(jsonData: string): FileSystemChangeEvent {
    const data = JSON.parse(jsonData) as { changes: FileSystemChangeDict[] };
    return FileSystemChangeEvent.fromDict(data);
  }
}

export const serializeChangeEvent = (event: FileSystemChangeEvent): string => event.toJson();

export const deserializeChangeEvent = (jsonData: string): FileSystemChangeEvent =>
  FileSystemChangeEvent.fromJson(jsonData);
