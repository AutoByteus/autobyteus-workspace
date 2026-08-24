import { onMounted, onUpdated } from 'vue';
import Prism from 'prismjs';

// Core Prism CSS
import 'prismjs/themes/prism.css';

// Base languages first
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';

// Languages that depend on markup
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup-templating';

// Other languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';

// PHP must be imported after markup-templating
import 'prismjs/components/prism-php';

export function usePrismHighlighter() {
  const initializePrism = () => {
    // Ensure Prism is properly loaded
    if (!Prism.languages.markup || !Prism.languages.php) {
      console.warn('Prism languages not properly initialized');
      return false;
    }
    return true;
  };

  const highlightCode = () => {
    try {
      if (!initializePrism()) {
        throw new Error('Prism initialization failed');
      }
      
      // Use nextTick to ensure DOM is updated
      setTimeout(() => {
        Prism.highlightAll();
      }, 0);
    } catch (error) {
      console.error('Prism.js highlighting failed:', error);
    }
  };

  onMounted(() => {
    initializePrism();
    highlightCode();
  });
  
  onUpdated(highlightCode);

  return {
    highlightCode,
    initializePrism
  };
}