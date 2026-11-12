import { inject, type InjectionKey } from 'vue'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

/** "This file is on {{node}}, where this run runs." (autobyteus-471 REQ-003). */
export const FILE_ON_OTHER_NODE_MESSAGE_KEY =
  'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_on_other_node'

/**
 * Where a run's file paths are when another node runs it (autobyteus-471 REQ-003): that node's name, and this window
 * reads none of them; null for a run of this node. The one decision for a conversation's file links and path
 * attachments, on the desktop and on the phone.
 */
export const remoteRunFileNode = (agentRunId: string | null | undefined): string | null =>
  useRemoteRunsStore().runOfAgentRun(agentRunId)?.nodeName ?? null

/**
 * The run view a conversation is shown in (`AgentEventMonitor`), for what a message opens: `refuseRemoteRunPath` shows
 * the other-node message on the view's file status line and answers true when the view's run is a remote run (its
 * paths are not this window's node's), false otherwise.
 */
export type RunViewFiles = Readonly<{ refuseRemoteRunPath: () => boolean }>

export const RUN_VIEW_FILES_KEY: InjectionKey<RunViewFiles> = Symbol('runViewFiles')

/** The run view around this component; null outside one. */
export const useRunViewFiles = (): RunViewFiles | null => inject(RUN_VIEW_FILES_KEY, null)
