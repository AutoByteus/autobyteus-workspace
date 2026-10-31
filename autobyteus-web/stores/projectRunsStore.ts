import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetProjectRunHistory } from '~/graphql/queries/projectRunHistoryQueries'
import { useProjectStore } from '~/stores/projectStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useRunHistoryRetiredRunsStore } from '~/stores/runHistoryRetiredRuns'
import { parseAgentOrgHistoryItems } from '~/stores/runHistoryStoreSupport'
import { buildProjectRunsProjection, projectRootKey, type ProjectRunRootKind, type ProjectRunsSnapshot } from '~/stores/projectRunsProjection'
import { taskExecutionKey, type TaskExecutionReference } from '~/utils/collaboration/taskExecutionScope'
import type { ProjectChangeMessage } from '~/types/project'

type ProjectRunHistoryData = {
  projectRunHistory: {
    projectId: string
    agentDefinitions: ProjectRunsSnapshot['agentDefinitions']
    teamDefinitions: ProjectRunsSnapshot['teamDefinitions']
    agentOrgRuns: unknown[]
    scopes: Array<{ rootKind: ProjectRunRootKind; rootRunId: string; executions: TaskExecutionReference[] }>
  }
}

/**
 * The web's changes to a listed root (DS-004 trigger 4), by the store that owns each: archive and delete (run history),
 * and Stop (Agent, Team and Org runs). After each, the Projects listing the run are read again, so a stopped run with no
 * live context in this window shows stopped, as Workspaces' own refresh shows it (CR-003).
 */
const RUN_HISTORY_REMOVALS = new Set(['archiveRun', 'deleteRun', 'archiveTeamRun', 'deleteTeamRun', 'archiveAgentOrgRun',
  'deleteAgentOrgRun', 'archiveAgentRunGroup', 'archiveTeamRuns', 'archiveAgentOrgRuns'])
const AGENT_RUN_STOPS = new Set(['terminateRun'])
const TEAM_RUN_STOPS = new Set(['terminateTeamRun'])
const ORG_RUN_STOPS = new Set(['terminate'])

const readProjectRunHistory = async (projectId: string): Promise<ProjectRunsSnapshot> => {
  const { data, errors } = await getApolloClient().query<ProjectRunHistoryData>({
    query: GetProjectRunHistory,
    variables: { projectId },
    fetchPolicy: 'network-only',
    context: { queryDeduplication: false },
  })
  if (errors?.length) throw Object.assign(new Error(errors.map((error) => error.message).join(', ')), {
    code: (errors[0]?.extensions as { code?: string } | undefined)?.code ?? null,
  })
  const read = data!.projectRunHistory
  return {
    projectId: read.projectId,
    agentDefinitions: read.agentDefinitions,
    teamDefinitions: read.teamDefinitions,
    agentOrgRuns: parseAgentOrgHistoryItems(read.agentOrgRuns),
    scopes: Object.fromEntries(read.scopes.map((scope) => [projectRootKey(scope.rootKind, scope.rootRunId),
      new Set(scope.executions.map(taskExecutionKey).filter((key): key is string => key !== null))])),
  }
}

/**
 * Projects mode's read state (DS-003, DS-004): every Project's snapshot, read when the mode is shown and re-read on
 * the explicit triggers; one read per Project in flight and one queued, so an older answer never replaces a newer one;
 * a failed read keeps the last good snapshot. The tree itself is `projection`, built by `projectRunsProjection`.
 */
export const useProjectRunsStore = defineStore('projectRuns', () => {
  const projectStore = useProjectStore()
  const node = useWindowNodeContextStore()
  const snapshots = ref<Record<string, ProjectRunsSnapshot>>({})
  const failed = ref<Record<string, true>>({})
  /** The first read of the shown mode: the Projects list and each Project's runs. */
  const firstRead = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const shown = ref(0)
  const inFlight = new Map<string, Promise<void>>()
  const queued = new Set<string>()
  const notedCopyKeys = new Map<string, Set<string>>()
  let generation = 0

  const read = (projectId: string): Promise<void> => {
    const current = inFlight.get(projectId)
    if (current) { queued.add(projectId); return current }
    const atStart = generation
    const run = (async () => {
      try {
        const snapshot = await readProjectRunHistory(projectId)
        if (atStart !== generation) return
        snapshots.value = { ...snapshots.value, [projectId]: snapshot }
        const { [projectId]: _, ...rest } = failed.value
        failed.value = rest
      } catch (error) {
        if (atStart !== generation) return
        if ((error as { code?: string }).code === 'PROJECT_NOT_FOUND') {
          // A deleted Project leaves the tree; its runs stay in Workspaces (REQ-013).
          const { [projectId]: _, ...rest } = snapshots.value
          snapshots.value = rest
          return
        }
        failed.value = { ...failed.value, [projectId]: true }
      } finally {
        inFlight.delete(projectId)
        if (queued.delete(projectId) && atStart === generation) void read(projectId)
      }
    })()
    inFlight.set(projectId, run)
    return run
  }

  const loadAll = async (): Promise<void> => {
    if (firstRead.value !== 'ready') firstRead.value = 'loading'
    try {
      const projects = await projectStore.fetchProjects(true)
      await Promise.all(projects.map((project) => read(project.projectId)))
      const anyRead = projects.length === 0 || projects.some((project) => snapshots.value[project.projectId])
      firstRead.value = anyRead ? 'ready' : (firstRead.value === 'ready' ? 'ready' : 'error')
    } catch {
      if (firstRead.value !== 'ready') firstRead.value = 'error'
      else failed.value = { ...failed.value, __list: true }
    }
  }

  /** Projects mode is shown (the tree is mounted): every Project is read; the feed stays open meanwhile. */
  const show = (): (() => void) => {
    shown.value += 1
    void loadAll()
    return () => { shown.value = Math.max(0, shown.value - 1) }
  }

  /** The Projects whose snapshot lists a root (an Agent, Team or Org run). */
  const projectsListing = (rootRunId: string): string[] => Object.values(snapshots.value)
    .filter((snapshot) => snapshot.agentDefinitions.some((group) => group.runs.some((run) => run.runId === rootRunId))
      || snapshot.teamDefinitions.some((group) => group.runs.some((run) => run.teamRunId === rootRunId))
      || snapshot.agentOrgRuns.some((run) => run.rootRunId === rootRunId))
    .map((snapshot) => snapshot.projectId)

  /** The `/ws/projects` feed (DS-004 triggers 1–3); nothing is read while Projects mode is hidden. */
  const applyChange = (message: ProjectChangeMessage): void => {
    if (shown.value === 0) return
    if (message.type === 'connected') { void loadAll(); return }
    if (message.type === 'project_upserted') { void read(message.project.projectId); return }
    if (message.type === 'project_removed') {
      const { [message.projectId]: _, ...rest } = snapshots.value
      snapshots.value = rest
      return
    }
    if (message.type !== 'task_upserted' && message.type !== 'task_removed') return
    if (message.scope.kind === 'project') {
      if (snapshots.value[message.scope.projectId]) void read(message.scope.projectId)
      return
    }
    // A Temp task carries no Project: re-read the Projects listing its hosting root (SCN-009).
    const hostRunId = message.type === 'task_upserted' ? message.task.root?.hostRoot.runId : null
    if (hostRunId) projectsListing(hostRunId).forEach((projectId) => void read(projectId))
  }

  /** A run was started under the Project from this window (DS-004 trigger 4). */
  const noteRunStarted = (projectId: string): void => { if (shown.value > 0) void read(projectId) }

  /** Top-level copies a listed root shows that are in no scope yet: one re-read per copy (DS-004 trigger 5). */
  const noteUnscoped = (projectId: string, copyKeys: readonly string[]): void => {
    const noted = notedCopyKeys.get(projectId) ?? new Set<string>()
    notedCopyKeys.set(projectId, noted)
    const fresh = copyKeys.filter((key) => !noted.has(key))
    if (!fresh.length) return
    fresh.forEach((key) => noted.add(key))
    void read(projectId)
  }

  // Web actions on a listed root (DS-004 trigger 4): the Projects listing the run read again once the action settled.
  // A run named by no listing (a group archive names a folder and a definition) re-reads every loaded Project.
  type ActionObserved = Readonly<{ name: string; args: unknown[]; after(callback: () => void): void }>
  const rereadAfter = (store: Readonly<{ $onAction(listener: (action: ActionObserved) => void): unknown }>, actions: ReadonlySet<string>) =>
    store.$onAction(({ name, args, after }) => {
      if (!actions.has(name) || shown.value === 0) return
      after(() => {
        const ids = args.flatMap((arg) => (Array.isArray(arg) ? arg : [arg])).filter((arg): arg is string => typeof arg === 'string')
        const listing = new Set(ids.flatMap(projectsListing))
        ;(listing.size ? [...listing] : Object.keys(snapshots.value)).forEach((projectId) => void read(projectId))
      })
    })
  rereadAfter(useRunHistoryStore(), RUN_HISTORY_REMOVALS)
  rereadAfter(useAgentRunStore(), AGENT_RUN_STOPS)
  rereadAfter(useAgentTeamRunStore(), TEAM_RUN_STOPS)
  rereadAfter(useAgentOrgRunStore(), ORG_RUN_STOPS)

  // Another node: nothing read for the previous one is kept.
  watch(() => node.bindingRevision, () => {
    generation += 1
    snapshots.value = {}
    failed.value = {}
    firstRead.value = 'idle'
    notedCopyKeys.clear()
    queued.clear()
    if (shown.value > 0) void loadAll()
  })

  const projection = computed(() => buildProjectRunsProjection({
    projects: projectStore.projects,
    snapshots: snapshots.value,
    agentContexts: useAgentContextsStore().runs,
    teamContexts: useAgentTeamContextsStore().allTeamRuns ?? [],
    agentAvatarByDefinitionId: useRunHistoryStore().agentAvatarByDefinitionId,
    workspacesById: useWorkspaceStore().workspaces,
    retiredRunIds: useRunHistoryRetiredRunsStore().retiredRunIds,
    noteUnscoped,
  }))

  return {
    snapshots,
    firstRead,
    /** A later read failed: the last good tree stays with the refresh error (REQ-011). */
    refreshFailed: computed(() => firstRead.value === 'ready' && Object.keys(failed.value).length > 0),
    projection,
    show,
    retry: () => { failed.value = {}; return loadAll() },
    applyChange,
    noteRunStarted,
    noteUnscoped,
  }
})
