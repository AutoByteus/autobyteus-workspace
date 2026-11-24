/**
 * The file types that are highlighted, each with its language name in the two engines that highlight them
 * (autobyteus-642 D-4, DEC-002): Monaco in the file viewer, Prism in chat file previews. The engines name languages
 * differently, so each row carries both: Monaco has no TOML (its `ini` grammar is the closest) and no Vue (`html`); Prism
 * calls HTML and XML `markup`, shell `bash` and Dockerfile `docker`. A file matches by its extension, or by its whole
 * name (`Dockerfile`).
 */
type HighlightedFileType = Readonly<{
  extensions: readonly string[];
  names?: readonly string[];
  monaco: string;
  prism: string;
}>;

const HIGHLIGHTED_FILE_TYPES: readonly HighlightedFileType[] = [
  { extensions: ['py'], monaco: 'python', prism: 'python' },
  { extensions: ['ts'], monaco: 'typescript', prism: 'typescript' },
  { extensions: ['js', 'jsx'], monaco: 'javascript', prism: 'javascript' },
  // Prism's `vue` is highlighted section by section (`highlightService.highlightVue`).
  { extensions: ['vue'], monaco: 'html', prism: 'vue' },
  { extensions: ['html'], monaco: 'html', prism: 'markup' },
  { extensions: ['php'], monaco: 'php', prism: 'php' },
  { extensions: ['rb'], monaco: 'ruby', prism: 'ruby' },
  { extensions: ['css'], monaco: 'css', prism: 'css' },
  { extensions: ['json'], monaco: 'json', prism: 'json' },
  { extensions: ['md'], monaco: 'markdown', prism: 'markdown' },
  { extensions: ['yaml', 'yml'], monaco: 'yaml', prism: 'yaml' },
  { extensions: ['toml'], monaco: 'ini', prism: 'toml' },
  { extensions: ['sh', 'bash', 'zsh'], monaco: 'shell', prism: 'bash' },
  { extensions: ['go'], monaco: 'go', prism: 'go' },
  { extensions: ['rs'], monaco: 'rust', prism: 'rust' },
  { extensions: ['java'], monaco: 'java', prism: 'java' },
  { extensions: ['xml'], monaco: 'xml', prism: 'markup' },
  { extensions: ['ini'], monaco: 'ini', prism: 'ini' },
  { extensions: [], names: ['dockerfile'], monaco: 'dockerfile', prism: 'docker' },
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

/** The Prism language of the file at `filePath` (chat file previews), `plaintext` for a type not highlighted. */
export const getPrismLanguage = (filePath: string): string => fileTypeOf(filePath)?.prism ?? PLAIN_TEXT;
