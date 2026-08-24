import MarkdownIt from 'markdown-it';
import highlightService from '~/services/highlightService';

export function markdownItPrism(md: MarkdownIt) {
  const fence = md.renderer.rules.fence!;

  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const lang = token.info.trim();
    
    // Skip if language is mermaid, let the mermaid fence rule handle it
    if (lang === 'mermaid' || lang === 'mmd') {
      return fence(tokens, idx, options, env, slf);
    }
    
    // If language is specified (and not plantuml)
    if (lang) {
      try {
        const highlighted = highlightService.highlight(token.content, lang);
        const languageClass = `language-${lang}`;
        
        return `<pre class="${languageClass}"><code class="${languageClass}">${highlighted}</code></pre>`;
      } catch (error) {
        console.warn('Error highlighting code block:', error);
      }
    }

    // Fallback to default fence rendering
    return fence(tokens, idx, options, env, slf);
  };
}
