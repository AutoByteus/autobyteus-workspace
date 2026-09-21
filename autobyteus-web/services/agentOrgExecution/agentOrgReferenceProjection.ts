import sha256 from 'crypto-js/sha256'
import type { TeamReferenceFile } from '~/types/teamReferenceFile'

const referenceType = (filePath: string): TeamReferenceFile['type'] => {
  const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'image'
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(extension)) return 'audio'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'video'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'csv') return 'csv'
  if (['xls', 'xlsx'].includes(extension)) return 'excel'
  return 'file'
}

export const projectAgentOrgReference = (
  ownerId: string,
  filePath: string,
  timestamp: string,
): TeamReferenceFile => Object.freeze({
  referenceId: sha256(`${ownerId}\0${filePath}`).toString(),
  path: filePath,
  type: referenceType(filePath),
  createdAt: timestamp,
  updatedAt: timestamp,
})
