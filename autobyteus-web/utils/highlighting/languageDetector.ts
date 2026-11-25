/**
 * The file types the file viewer highlights, each with its Monaco language (autobyteus-642 D-4, SR-006). Monaco has no
 * TOML (its `ini` grammar is the closest) and no Vue (`html`). A file matches by its extension, or by its whole name
 * (`Dockerfile`). Chat messages highlight code blocks by their fence's name instead (`highlightService`).
 */
type HighlightedFileType = Readonly<{
  extensions: readonly string[];
  names?: readonly string[];
  monaco: string;
}>;

const HIGHLIGHTED_FILE_TYPES: readonly HighlightedFileType[] = [
  { extensions: ['py'], monaco: 'python' },
  { extensions: ['ts'], monaco: 'typescript' },
  { extensions: ['js', 'jsx'], monaco: 'javascript' },
  { extensions: ['vue'], monaco: 'html' },
  { extensions: ['html'], monaco: 'html' },
  { extensions: ['php'], monaco: 'php' },
  { extensions: ['rb'], monaco: 'ruby' },
  { extensions: ['css'], monaco: 'css' },
  { extensions: ['json'], monaco: 'json' },
  { extensions: ['md'], monaco: 'markdown' },
  { extensions: ['yaml', 'yml'], monaco: 'yaml' },
  { extensions: ['toml'], monaco: 'ini' },
  { extensions: ['sh', 'bash', 'zsh'], monaco: 'shell' },
  { extensions: ['go'], monaco: 'go' },
  { extensions: ['rs'], monaco: 'rust' },
  { extensions: ['java'], monaco: 'java' },
  { extensions: ['xml'], monaco: 'xml' },
  { extensions: ['ini'], monaco: 'ini' },
  { extensions: [], names: ['dockerfile'], monaco: 'dockerfile' },
];

const PLAIN_TEXT = 'plaintext';

/** The row of the file at `filePath`: by its whole name first, then by its extension. */
const fileTypeOf = (filePath: string): HighlightedFileType | undefined => {
  const name = (filePath.split(/[\\/]/).pop() ?? '').toLowerCase();
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? name.slice(dot + 1) : '';
  return HIGHLIGHTED_FILE_TYPES.find((type) => type.names?.includes(name))
    ?? (extension ? HIGHLIGHTED_FILE_TYPES.find((type) => type.extensions.includes(extension)) : undefined);
};

/** The Monaco language of the file at `filePath` (the file viewer), `plaintext` for a type not highlighted. */
export const getMonacoLanguage = (filePath: string): string => fileTypeOf(filePath)?.monaco ?? PLAIN_TEXT;
