import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';

/**
 * Highlights Vue code by separately highlighting template, script, and style sections.
 * @param code - The Vue single-file component code.
 * @returns A string with highlighted HTML.
 */
export function highlightVueCode(code: string): string {
  // Split Vue code into sections
  const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/);

  // Highlight each section separately
  const templateCode = templateMatch 
    ? Prism.highlight(templateMatch[1].trim(), Prism.languages.markup, 'markup') 
    : '';
  const scriptCode = scriptMatch 
    ? Prism.highlight(scriptMatch[1].trim(), Prism.languages.typescript, 'typescript') 
    : '';
  const styleCode = styleMatch 
    ? Prism.highlight(styleMatch[1].trim(), Prism.languages.css, 'css') 
    : '';

  // Combine highlighted sections
  return `
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>template</span><span class="token punctuation">&gt;</span></span>
${templateCode}
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>template</span><span class="token punctuation">&gt;</span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">lang</span><span class="token attr-value"><span class="token punctuation attr-equals">=</span><span class="token punctuation">"</span>ts<span class="token punctuation">"</span></span><span class="token punctuation">&gt;</span></span>
${scriptCode}
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">&gt;</span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">&gt;</span></span>
${styleCode}
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">&gt;</span></span>
  `.trim();
}