import type MarkdownIt from 'markdown-it';

/** Puts each rendered table in its own horizontal scroll box, so a table that cannot wrap never widens the document. */
export function markdownItScrollableTables(md: MarkdownIt): void {
  md.renderer.rules.table_open = (tokens, idx, options, _env, self) => (
    `<div class="markdown-table-scroll">${self.renderToken(tokens, idx, options)}`
  );
  md.renderer.rules.table_close = (tokens, idx, options, _env, self) => (
    `${self.renderToken(tokens, idx, options)}</div>`
  );
}
