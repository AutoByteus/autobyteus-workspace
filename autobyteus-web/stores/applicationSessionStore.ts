import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  CreateApplicationSession,
  SendApplicationInput,
  TerminateApplicationSession,
} from '~/graphql/mutations/applicationSessionMutations'
import {
  GetApplicationSession,
  GetApplicationSessionBinding,
} from '~/graphql/queries/applicationSessionQueries'
import {
  type ApplicationCatalogEntry,
  useApplicationStore,
} from '~/stores/applicationStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import {
  type ApplicationSession,
  type ApplicationSessionBinding,
  type ApplicationSessionSnapshot,
  type ApplicationUserContextFile,
} from '~/types/application/ApplicationSession'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkspaceStore } from '~/stores/workspace'
import {
  buildPreparedAgentLaunch,
  buildPreparedTeamLaunch,
  buildTeamMemberConfigs,
  normalizeModelConfig,
  normalizeModelIdentifier,
  normalizeRuntimeKind,
  resolveWorkspaceRootPath,
  type PreparedApplicationLaunch,
} from '~/utils/application/applicationLaunch'
import { ApplicationSessionStreamingService } from '~/services/applicationStreaming/ApplicationSessionStreamingService'
import { buildApplicationSessionTransport } from '~/utils/application/applicationSessionTransport'
export type { PreparedApplicationLaunch } from '~/utils/application/applicationLaunch'

interface ApplicationSessionCommandPayload {
  success?: boolean
  message?: string
  session?: ApplicationSessionSnapshot | null
}

interface GetApplicationSessionResult {
  applicationSession?: ApplicationSessionSnapshot | null
}

interface GetApplicationSessionBindingResult {
  applicationSessionBinding?: Omit<ApplicationSessionBinding, 'session'> & {
    session?: ApplicationSessionSnapshot | null
  } | null
}


const isLiveSession = (session: ApplicationSession | null | undefined): session is ApplicationSession =>
  session != null && session.terminatedAt === null

export const useApplicationSessionStore = defineStore('applicationSession', () => {
  const sessions = ref<Record<string, ApplicationSession>>({})
  const activeSessionIdByApplicationId = ref<Record<string, string | null>>({})
  const launching = ref(false)
  const launchError = ref<string | null>(null)
  const streamServices = new Map<string, ApplicationSessionStreamingService>()

  const getSessionById = (applicationSessionId: string): ApplicationSession | null =>
    sessions.value[applicationSessionId] ?? null

  const activeSessions = computed(() =>
    Object.entries(activeSessionIdByApplicationId.value)
      .map(([, applicationSessionId]) => (
        applicationSessionId ? sessions.value[applicationSessionId] ?? null : null
      ))
      .filter(isLiveSession),
  )

  const getCachedActiveSessionByApplicationId = (
    applicationId: string,
  ): ApplicationSession | null =>
    (() => {
      const applicationSessionId = activeSessionIdByApplicationId.value[applicationId] ?? null
      if (!applicationSessionId) {
        return null
      }

      const session = sessions.value[applicationSessionId] ?? null
      return session?.terminatedAt === null ? session : null
    })()

  const syncActiveSessionIndex = (
    session: ApplicationSessionSnapshot | null | undefined,
  ): void => {
    if (!session) {
      return
    }

    const applicationId = session.application.applicationId
    if (session.terminatedAt === null) {
      activeSessionIdByApplicationId.value = {
        ...activeSessionIdByApplicationId.value,
        [applicationId]: session.applicationSessionId,
      }
      return
    }

    if (activeSessionIdByApplicationId.value[applicationId] !== session.applicationSessionId) {
      return
    }

    const nextActiveSessions = { ...activeSessionIdByApplicationId.value }
    delete nextActiveSessions[applicationId]
    activeSessionIdByApplicationId.value = nextActiveSessions
  }

  const ensureBackendReady = async (): Promise<void> => {
    const windowNodeContextStore = useWindowNodeContextStore()
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
    }
  }

  const ensureApplication = async (applicationId: string): Promise<ApplicationCatalogEntry> => {
    const applicationStore = useApplicationStore()
    const existing = applicationStore.getApplicationById(applicationId)
    if (existing) {
      return existing
    }

    const fetched = await applicationStore.fetchApplicationById(applicationId)
    if (!fetched) {
      throw new Error(`Application '${applicationId}' was not found.`)
    }
    return fetched
  }

  const prepareLaunchDraft = async (
    applicationId: string,
  ): Promise<PreparedApplicationLaunch> => {
    const application = await ensureApplication(applicationId)
    const agentDefinitionStore = useAgentDefinitionStore()
    const teamDefinitionStore = useAgentTeamDefinitionStore()

    await Promise.all([
      agentDefinitionStore.fetchAllAgentDefinitions(),
      teamDefinitionStore.fetchAllAgentTeamDefinitions(),
    ])

    if (application.runtimeTarget.kind === 'AGENT') {
      const agentDefinition = agentDefinitionStore.getAgentDefinitionById(
        application.runtimeTarget.definitionId,
      )
      if (!agentDefinition) {
        throw new Error(
          `Application '${application.name}' is missing agent definition '${application.runtimeTarget.definitionId}'.`,
        )
      }

      return buildPreparedAgentLaunch(application, agentDefinition)
    }

    const teamDefinition = teamDefinitionStore.getAgentTeamDefinitionById(
      application.runtimeTarget.definitionId,
    )
    if (!teamDefinition) {
      throw new Error(
        `Application '${application.name}' is missing team definition '${application.runtimeTarget.definitionId}'.`,
      )
    }

    return buildPreparedTeamLaunch(
      application,
      teamDefinition,
      (agentDefinitionId: string) => agentDefinitionStore.getAgentDefinitionById(agentDefinitionId),
      (teamDefinitionId: string) => teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
    )
  }

  const mergeSessionSnapshot = (snapshot: ApplicationSessionSnapshot): ApplicationSession => {
    sessions.value = {
      ...sessions.value,
      [snapshot.applicationSessionId]: snapshot,
    }

    syncActiveSessionIndex(snapshot)
    if (snapshot.terminatedAt !== null) {
      disconnectSessionStream(snapshot.applicationSessionId)
    }
    return snapshot
  }

  const upsertCommandSession = (session: ApplicationSessionSnapshot | null | undefined): ApplicationSession | null => {
    if (!session) {
      return null
    }
    return mergeSessionSnapshot(session)
  }

  const disconnectSessionStream = (applicationSessionId: string): void => {
    const service = streamServices.get(applicationSessionId)
    if (!service) {
      return
    }
    service.disconnect()
    streamServices.delete(applicationSessionId)
  }

  const connectSessionStream = (applicationSessionId: string): void => {
    const existingService = streamServices.get(applicationSessionId)
    if (existingService) {
      return
    }

    const windowNodeContextStore = useWindowNodeContextStore()
    const endpoints = windowNodeContextStore.getBoundEndpoints()
    const transport = buildApplicationSessionTransport(endpoints)
    const service = new ApplicationSessionStreamingService(transport.sessionStreamUrl)
    service.connect(applicationSessionId, (nextSnapshot) => {
      mergeSessionSnapshot(nextSnapshot)
    })
    streamServices.set(applicationSessionId, service)
  }

  const fetchSessionById = async (applicationSessionId: string): Promise<ApplicationSession | null> => {
    await ensureBackendReady()
    const client = getApolloClient()
    const { data, errors } = await client.query<GetApplicationSessionResult>({
      query: GetApplicationSession,
      variables: { id: applicationSessionId },
      fetchPolicy: 'network-only',
    })

    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }

    const snapshot = data.applicationSession ?? null
    const session = upsertCommandSession(snapshot)
    if (session?.terminatedAt === null) {
      connectSessionStream(session.applicationSessionId)
    }
    return session
  }

  const bindApplicationRoute = async (
    applicationId: string,
    requestedSessionId?: string | null,
  ): Promise<ApplicationSessionBinding> => {
    await ensureBackendReady()
    const client = getApolloClient()
    const { data, errors } = await client.query<GetApplicationSessionBindingResult>({
      query: GetApplicationSessionBinding,
      variables: {
        applicationId,
        requestedSessionId: requestedSessionId?.trim() || null,
      },
      fetchPolicy: 'network-only',
    })

    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }

    const bindingPayload = data.applicationSessionBinding
    if (!bindingPayload) {
      throw new Error(`Application binding for '${applicationId}' was not returned.`)
    }

    const session = bindingPayload.session ? mergeSessionSnapshot(bindingPayload.session) : null
    if (!session && bindingPayload.resolution === 'none') {
      const nextActiveSessions = { ...activeSessionIdByApplicationId.value }
      delete nextActiveSessions[bindingPayload.applicationId]
      activeSessionIdByApplicationId.value = nextActiveSessions
    }
    if (session?.terminatedAt === null) {
      connectSessionStream(session.applicationSessionId)
    }

    return {
      applicationId: bindingPayload.applicationId,
      requestedSessionId: bindingPayload.requestedSessionId,
      resolvedSessionId: bindingPayload.resolvedSessionId,
      resolution: bindingPayload.resolution,
      session,
    }
  }

  const createApplicationSession = async (
    preparedLaunch: PreparedApplicationLaunch,
  ): Promise<ApplicationSession> => {
    launching.value = true
    launchError.value = null

    try {
      await ensureBackendReady()
      const client = getApolloClient()
      const workspaceStore = useWorkspaceStore()
      const input = preparedLaunch.kind === 'AGENT'
        ? {
            applicationId: preparedLaunch.application.id,
            workspaceRootPath: resolveWorkspaceRootPath(
              workspaceStore,
              preparedLaunch.config.workspaceId,
            ),
            workspaceId: preparedLaunch.config.workspaceId || null,
            llmModelIdentifier: normalizeModelIdentifier(preparedLaunch.config.llmModelIdentifier),
            autoExecuteTools: preparedLaunch.config.autoExecuteTools,
            llmConfig: normalizeModelConfig(preparedLaunch.config.llmConfig),
            skillAccessMode: preparedLaunch.config.skillAccessMode,
            runtimeKind: normalizeRuntimeKind(preparedLaunch.config.runtimeKind),
          }
        : {
            applicationId: preparedLaunch.application.id,
            memberConfigs: buildTeamMemberConfigs(
              preparedLaunch,
              resolveWorkspaceRootPath(workspaceStore, preparedLaunch.config.workspaceId),
            ),
          }

      const { data, errors } = await client.mutate<{ createApplicationSession?: ApplicationSessionCommandPayload | null }>({
        mutation: CreateApplicationSession,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const result = data?.createApplicationSession
      if (!result?.success || !result.session) {
        throw new Error(result?.message || 'Failed to create application session.')
      }

      const session = mergeSessionSnapshot(result.session)
      connectSessionStream(session.applicationSessionId)
      return session
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      launchError.value = nextError.message
      throw nextError
    } finally {
      launching.value = false
    }
  }

  const terminateSession = async (applicationSessionId: string): Promise<boolean> => {
    await ensureBackendReady()
    const client = getApolloClient()
    const { data, errors } = await client.mutate<{ terminateApplicationSession?: ApplicationSessionCommandPayload | null }>({
      mutation: TerminateApplicationSession,
      variables: { applicationSessionId },
    })

    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }

    const result = data?.terminateApplicationSession
    if (!result?.success) {
      return false
    }

    if (result.session) {
      mergeSessionSnapshot(result.session)
    }
    disconnectSessionStream(applicationSessionId)
    return true
  }

  const sendApplicationInputMessage = async (input: {
    applicationSessionId: string
    text: string
    targetMemberName?: string | null
    contextFiles?: ApplicationUserContextFile[] | null
    metadata?: Record<string, unknown> | null
  }): Promise<ApplicationSession | null> => {
    await ensureBackendReady()
    const client = getApolloClient()
    const { data, errors } = await client.mutate<{ sendApplicationInput?: ApplicationSessionCommandPayload | null }>({
      mutation: SendApplicationInput,
      variables: {
        input: {
          applicationSessionId: input.applicationSessionId,
          text: input.text,
          targetMemberName: input.targetMemberName ?? null,
          contextFiles: input.contextFiles ?? [],
          metadata: input.metadata ?? null,
        },
      },
    })

    if (errors && errors.length > 0) {
      throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
    }

    const result = data?.sendApplicationInput
    if (!result?.success) {
      throw new Error(result?.message || 'Failed to send application input.')
    }

    return upsertCommandSession(result.session)
  }

  const clearLaunchError = (): void => {
    launchError.value = null
  }

  return {
    sessions,
    activeSessions,
    activeSessionIdByApplicationId,
    launching,
    launchError,
    getSessionById,
    getCachedActiveSessionByApplicationId,
    prepareLaunchDraft,
    fetchSessionById,
    bindApplicationRoute,
    createApplicationSession,
    connectSessionStream,
    sendApplicationInputMessage,
    terminateSession,
    clearLaunchError,
  }
})
