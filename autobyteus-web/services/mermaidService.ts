import mermaid from 'mermaid';

export const mermaidService = {
  /**
   * Initialize mermaid with configuration
   * @param isDarkTheme Whether to use dark theme
   */
  initialize(isDarkTheme = false) {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkTheme ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  },

  /**
   * Render a mermaid diagram to SVG
   * @param content The mermaid diagram definition
   * @param id Optional unique ID for the diagram
   * @returns Promise resolving to the SVG string
   */
  async render(content: string, id?: string): Promise<string> {
    const diagramId = id || `mermaid-graph-${Math.floor(Math.random() * 10000)}`;
    const { svg } = await mermaid.render(diagramId, content);
    return svg;
  },

  /**
   * Validate mermaid syntax
   * @param content The mermaid diagram definition
   * @returns Promise resolving to true if valid, false otherwise
   */
  async validate(content: string): Promise<boolean> {
    try {
      await mermaid.parse(content);
      return true;
    } catch (e) {
      return false;
    }
  }
};
