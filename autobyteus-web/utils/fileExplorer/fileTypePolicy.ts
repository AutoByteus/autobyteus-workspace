/**
 * File families that the shared FileViewer can render.
 *
 * This is deliberately a filename policy, not a filesystem probe. The
 * trusted content boundary still owns existence, regular-file, readability,
 * and byte validation after a supported path is opened.
 */
export type FileDataType = 'Text' | 'Image' | 'Audio' | 'Video' | 'Excel' | 'PDF' | 'Unsupported'

export type SupportedFileDataType = Exclude<FileDataType, 'Unsupported'>

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm'])
const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm', '.csv'])
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.text',
  '.md',
  '.markdown',
  '.mdown',
  '.mkdn',
  '.mkd',
  '.mdwn',
  '.html',
  '.htm',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.vue',
  '.py',
  '.pyw',
  '.rb',
  '.php',
  '.java',
  '.kt',
  '.kts',
  '.go',
  '.rs',
  '.swift',
  '.c',
  '.h',
  '.cc',
  '.cpp',
  '.cxx',
  '.hpp',
  '.cs',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.lua',
  '.json',
  '.json5',
  '.jsonc',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.bat',
  '.cmd',
  '.ini',
  '.cfg',
  '.conf',
  '.log',
  '.rst',
  '.adoc',
  '.tex',
  '.env',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
])

const TEXT_FILENAMES = new Set([
  'authors',
  'changelog',
  'contributing',
  'dockerfile',
  '.editorconfig',
  '.env',
  '.gitattributes',
  '.gitignore',
  'gemfile',
  'license',
  'makefile',
  'notice',
  'procfile',
  'rakefile',
  'readme',
])

const pathBasename = (filePath: string): string => {
  const normalizedPath = filePath.trim().replace(/\\/g, '/')
  return normalizedPath.split('/').filter(Boolean).at(-1)?.toLowerCase() ?? ''
}

const pathExtension = (basename: string): string => {
  const lastDot = basename.lastIndexOf('.')
  return lastDot > 0 ? basename.slice(lastDot) : ''
}

/**
 * Returns the shared FileViewer classification for a path without reading it.
 * Unknown extensions intentionally resolve to Unsupported rather than Text so
 * binary artifacts cannot be sent through a text reader by inference.
 */
export const determineFilePreviewType = (filePath: string): FileDataType => {
  const basename = pathBasename(filePath)
  const extension = pathExtension(basename)

  if (IMAGE_EXTENSIONS.has(extension)) return 'Image'
  if (AUDIO_EXTENSIONS.has(extension)) return 'Audio'
  if (VIDEO_EXTENSIONS.has(extension)) return 'Video'
  if (EXCEL_EXTENSIONS.has(extension)) return 'Excel'
  if (extension === '.pdf') return 'PDF'
  if (TEXT_EXTENSIONS.has(extension) || TEXT_FILENAMES.has(basename)) return 'Text'
  return 'Unsupported'
}
