import { inject, type InjectionKey } from 'vue';
import type { WorkspaceToolName } from '~/utils/layout/workspaceSurfaceOrder';

export type WorkspaceToolReveal = (tab: WorkspaceToolName) => Promise<boolean>;

export const WORKSPACE_TOOL_REVEAL_KEY: InjectionKey<WorkspaceToolReveal> =
  Symbol('workspaceToolReveal');

// Capture in descendant setup; lazy action handlers receive this local capability explicitly.
export function useWorkspaceToolReveal(): WorkspaceToolReveal | null {
  return inject(WORKSPACE_TOOL_REVEAL_KEY, null);
}
