import { useChatModelCatalog } from '~/composables/chat/useChatModelCatalog'
import { useLocalization } from '~/composables/useLocalization'
import { useWorkspaceStore } from '~/stores/workspace'
import { buildChatThinkingMenu } from '~/components/chat/chatThinkingMenu'
import { buildModelOptions, type ModelOptionLabels } from '~/components/chat/chatModelOptions'
import { runtimeShortLabel } from '~/utils/chat/chatDefaults'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { isAutoApproveLockedForRuntime } from '~/utils/agentRunRuntimeDraftPolicy'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { RunSettingsValues } from '~/types/runSettings/RunSettings'

/** Labels for run settings in the chat controls' words: read-only values and member summaries. */
export function useRunSettingsPresentation() {
  const catalog = useChatModelCatalog()
  const workspaceStore = useWorkspaceStore()
  const { t } = useLocalization()

  const folderName = (rootPath: string) => rootPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || rootPath

  const workspaceName = (workspace: RunWorkspaceChoice | null): string => {
    if (!workspace) return ''
    if (workspace.kind === 'folder') return folderName(workspace.rootPath)
    const info = workspaceStore.workspaces[workspace.workspaceId]
    if (workspace.workspaceId === workspaceStore.tempWorkspaceId || info?.isTemp) return t('chat.workspace.temp')
    return info?.name || folderName(info?.absolutePath || workspace.workspaceId)
  }

  const workspacePath = (workspace: RunWorkspaceChoice | null): string => {
    if (!workspace) return ''
    if (workspace.kind === 'folder') return workspace.rootPath
    const info = workspaceStore.workspaces[workspace.workspaceId]
    return info?.absolutePath || info?.workspaceConfig?.root_path || info?.workspaceConfig?.rootPath || ''
  }

  const modelLabel = (values: Pick<RunSettingsValues, 'runtimeKind' | 'llmModelIdentifier'>): string =>
    values.llmModelIdentifier ? catalog.modelLabel(values.runtimeKind, values.llmModelIdentifier) : ''

  const schemaOf = (values: Pick<RunSettingsValues, 'runtimeKind' | 'llmModelIdentifier'>) =>
    values.llmModelIdentifier ? catalog.schemaFor(values.runtimeKind, values.llmModelIdentifier) : null

  const thinkingMenu = (values: RunSettingsValues) =>
    buildChatThinkingMenu(schemaOf(values), values.llmConfig, (key) => t(key))

  const modelOptionLabels = (): ModelOptionLabels => ({
    default: t('chat.modelOption.default'),
    on: t('chat.modelOption.on'),
    off: t('chat.modelOption.off'),
  })

  const modelOptions = (values: RunSettingsValues) => buildModelOptions(schemaOf(values), values.llmConfig, modelOptionLabels())

  const approvalLabel = (values: Pick<RunSettingsValues, 'runtimeKind' | 'autoExecuteTools'>) =>
    values.autoExecuteTools || isAutoApproveLockedForRuntime(values.runtimeKind) ? t('chat.approval.autoApprove') : t('chat.approval.askFirst')

  return {
    ensureCatalog: (runtimeKind: string | null | undefined) => { if (runtimeKind) catalog.ensureCatalog(runtimeKind) },
    workspaceName,
    workspacePath,
    modelLabel,
    schemaOf,
    thinkingMenu,
    modelOptionLabels,
    modelOptions,
    approvalLabel,
    runtimeLabel: (runtimeKind: string) => runtimeKindToLabel(runtimeKind),
    runtimeShortLabel: (runtimeKind: string) => runtimeShortLabel(runtimeKind),
  }
}
