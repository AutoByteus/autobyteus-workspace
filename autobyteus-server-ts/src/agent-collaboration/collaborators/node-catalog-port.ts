import type { CatalogDefinitionRef } from "./catalog-address-map.js";
import type { CollaboratorLaunchBase, CollaboratorRootPort, InRunPlacementsByDefinition } from "./collaborator-root-port.js";

/**
 * The `CollaboratorRootPort` of "this node, no run": a run a peer node asks this node to start (design § Ownership
 * Map). There is no run, so nothing is in it, nothing is the viewer's own and nothing is inherited. It is the one
 * place of the remote-run rule (REQ-205, REQ-206): this node's temp workspace and tool auto-approve on, with the
 * target's own configured default as the only launch layer (the `defaults_only` base).
 */
export class NodeCatalogPort implements CollaboratorRootPort {
  readonly isApplicationBound = false;

  constructor(private readonly tempWorkspaceDir: string) {}

  launchBase(): CollaboratorLaunchBase {
    return Object.freeze({ kind: "defaults_only", workspaceRootPath: this.tempWorkspaceDir, autoExecuteTools: true });
  }

  ownDefinition(): CatalogDefinitionRef | null { return null; }

  inRunPlacementsByDefinition(): InRunPlacementsByDefinition { return new Map(); }

  addressesInUse(): ReadonlySet<string> { return new Set(); }
}
