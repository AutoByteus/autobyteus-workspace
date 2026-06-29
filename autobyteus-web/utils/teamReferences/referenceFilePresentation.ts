import type { TeamReferenceFile } from '~/types/teamReferenceFile';

export function referenceFileName(filePath: string): string {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || normalized || 'reference file';
}

export function referenceFileExtension(filePath: string): string {
  const name = referenceFileName(filePath).toLowerCase();
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex) : '';
}

export function referenceFileIcon(reference: Pick<TeamReferenceFile, 'path' | 'type'>): string {
  const ext = referenceFileExtension(reference.path);
  if (['.js', '.jsx', '.cjs', '.mjs'].includes(ext)) return 'vscode-icons:file-type-js';
  if (['.ts', '.tsx'].includes(ext)) return 'vscode-icons:file-type-typescript';
  if (ext === '.vue') return 'vscode-icons:file-type-vue';
  if (['.html', '.htm'].includes(ext)) return 'vscode-icons:file-type-html';
  if (['.css', '.scss', '.less'].includes(ext)) return 'vscode-icons:file-type-css';
  if (['.md', '.markdown'].includes(ext)) return 'vscode-icons:file-type-markdown';
  if (ext === '.json') return 'vscode-icons:file-type-json';
  if (ext === '.py') return 'vscode-icons:file-type-python';
  if (['.yaml', '.yml'].includes(ext)) return 'vscode-icons:file-type-yaml';
  if (['.sh', '.bash', '.zsh'].includes(ext)) return 'vscode-icons:file-type-shell';
  if (ext === '.xml') return 'vscode-icons:file-type-xml';
  if (ext === '.pdf' || reference.type === 'pdf') return 'vscode-icons:file-type-pdf';
  if (['.xlsx', '.xls', '.csv'].includes(ext) || reference.type === 'excel' || reference.type === 'csv') return 'vscode-icons:file-type-excel';
  if (['.txt', '.log'].includes(ext)) return 'vscode-icons:file-type-text';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext) || reference.type === 'image') return 'vscode-icons:file-type-image';
  if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext) || reference.type === 'audio') return 'vscode-icons:file-type-audio';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext) || reference.type === 'video') return 'vscode-icons:file-type-video';
  return 'vscode-icons:default-file';
}
