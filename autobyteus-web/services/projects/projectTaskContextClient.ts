import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { fetchWithRemoteAccessCredential, getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import type { ProjectTaskContextFile } from '~/types/project'
const segment = (value: string) => {
  if (!value || value === '.' || value === '..' || /[\\/\0]/.test(value)) throw new Error('Invalid Task context identity.')
  return encodeURIComponent(value)
}
const filename = (name: string) => {
  if (!/^ctx_[a-zA-Z0-9_-]+__[a-zA-Z0-9._-]+$/.test(name)) throw new Error('Invalid Task context filename.')
  return name
}
/** Captured node/credential transport; locators from data never become arbitrary fetch destinations. */
export function createProjectTaskContextClient(projectId: string, taskId?: string, eligible: () => boolean = () => true) {
  const node = useWindowNodeContextStore()
  const revision = node.bindingRevision
  const base = node.getBoundEndpoints().rest.replace(/\/$/, '')
  const credential = getActiveRemoteAccessCredential()
  const project = `${base}/projects/${segment(projectId)}`
  const drafts = `${project}/task-context-drafts`
  const draft = (id: string) => `${drafts}/${segment(id)}`
  const current = () => node.bindingRevision === revision && eligible()
  const request = async (url: string, init: RequestInit = {}, disposing = false) => {
    if (!disposing) {
      if (!await node.waitForBoundBackendReady() || !current()) throw new Error('Task context request is no longer current on this node.')
    }
    const response = await fetchWithRemoteAccessCredential(url, init, credential)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error?.message || body.detail || 'Task context request failed.')
    }
    return response
  }
  return {
    current,
    begin: async (): Promise<{draftId: string}> => (await request(drafts, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(taskId ? {taskId} : {})})).json(),
    upload: async (id: string, file: File): Promise<ProjectTaskContextFile> => {
      const body = new FormData(); body.append('file', file)
      return (await request(`${draft(id)}/context-files`, {method: 'POST', body})).json()
    },
    discard: async (id: string) => { await request(draft(id), {method: 'DELETE'}, true) },
    remove: async (id: string, name: string) => { await request(`${draft(id)}/context-files/${segment(filename(name))}`, {method: 'DELETE'}) },
    blob: async (file: ProjectTaskContextFile, draftId?: string): Promise<Blob> => {
      const url = draftId ? `${draft(draftId)}/context-files/${segment(filename(file.storedFilename))}`
        : `${project}/tasks/${segment(taskId!)}/context-files/${segment(filename(file.storedFilename))}`
      return (await request(url)).blob()
    },
  }
}
