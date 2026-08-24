import Prism from 'prismjs';

// Core Prism CSS
import 'prismjs/themes/prism.css';

// Base languages first
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';

// Languages that depend on markup
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup-templating';

// Languages that depend on clike
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-ruby';

// PHP must be imported after markup-templating
import 'prismjs/components/prism-php';

// Other languages
import 'prismjs/components/prism-json';

/**
 * Service for code syntax highlighting using Prism.js
 */
class HighlightService {
  private cache: Map<string, string>;
  
  constructor() {
    this.cache = new Map<string, string>();
  }

  /**
   * Highlight code with specified language
   * @param code The code to highlight
   * @param language The language for syntax highlighting
   * @returns Highlighted HTML string
   */
  public highlight(code: string, language: string): string {
    if (!code) return '';
    
    // Normalize language
    const normalizedLang = language.toLowerCase();
    
    // Generate cache key
    const cacheKey = `${normalizedLang}:${code}`;
    
    // Return cached result if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Get language grammar or fall back to plaintext
    const grammar = Prism.languages[normalizedLang] || Prism.languages.plaintext;
    
    // Highlight the code
    const highlighted = Prism.highlight(code, grammar, normalizedLang);
    
    // Cache the result
    this.cache.set(cacheKey, highlighted);
    
    // Prevent cache from growing too large
    this.manageCacheSize();
    
    return highlighted;
  }

  /**
   * Highlight Vue single-file component code
   * @param code The Vue component code
   * @returns Highlighted HTML string
   */
  public highlightVue(code: string): string {
    // Split Vue code into sections
    const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/);

    // Highlight each section separately
    const templateCode = templateMatch 
      ? this.highlight(templateMatch[1].trim(), 'markup')
      : '';
    const scriptCode = scriptMatch 
      ? this.highlight(scriptMatch[1].trim(), 'typescript')
      : '';
    const styleCode = styleMatch 
      ? this.highlight(styleMatch[1].trim(), 'css')
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

  /**
   * Highlight code in a DOM element
   * @param element The element containing code to highlight
   * @param language The language for syntax highlighting
   */
  public highlightElement(element: HTMLElement, language?: string): void {
    if (!element) return;
    
    // Skip if already highlighted
    if (element.getAttribute('data-highlighted') === 'true') return;
    
    try {
      // If language is specified and element has a class property
      if (language && element.classList) {
        // Ensure element has the correct language class
        const languageClass = `language-${language}`;
        if (!element.classList.contains(languageClass)) {
          element.classList.add(languageClass);
        }
      }
      
      // Use Prism to highlight the element
      Prism.highlightElement(element);
      
      // Mark as highlighted to prevent redundant processing
      element.setAttribute('data-highlighted', 'true');
    } catch (error) {
      console.error('Failed to highlight element:', error);
    }
  }
  
  /**
   * Find and highlight all code blocks within a container
   * @param container The container element to search within
   */
  public highlightCodeBlocks(container: HTMLElement): void {
    if (!container) return;
    
    // Find code blocks that haven't been highlighted yet
    const codeBlocks = container.querySelectorAll('pre code:not([data-highlighted="true"])');
    
    // Highlight each code block
    codeBlocks.forEach(block => {
      // Extract language from class name
      const classes = block.className.split(' ');
      const languageClass = classes.find(cls => cls.startsWith('language-'));
      const language = languageClass ? languageClass.replace('language-', '') : 'plaintext';
      
      // Highlight the element
      this.highlightElement(block as HTMLElement, language);
    });
  }
  
  /**
   * Clear the highlight cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get the current size of the highlight cache
   */
  public getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * Manage cache size to prevent memory issues
   */
  private manageCacheSize(): void {
    if (this.cache.size <= 1000) return;
    
    // Remove oldest entries when cache gets too large
    const keys = Array.from(this.cache.keys()).slice(0, 200);
    keys.forEach(key => this.cache.delete(key));
  }
}

// Export a singleton instance
const highlightService = new HighlightService();
export default highlightService;
