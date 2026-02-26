# AutoByteus Web - Documentation & Developer Guide

Welcome to the AutoByteus Web documentation. This project is structured around distinct "Concerns"—modular functional areas that interact to create the full application. Think of this documentation as a book, where each chapter covers a specific concern or architectural layer.

## 📚 Documentation Catalog

### Chapter 1: Architecture & Foundation
Understanding the system's backbone, how the pieces fit together, and how the application is delivered.

*   **[System Architecture](./ARCHITECTURE.md)**: The high-level map of the system, defining the frontend, backend, and Electron integration. Start here.
*   **[Agent Execution Architecture](./docs/agent_execution_architecture.md)**: A deep dive into the runtime behavior—how user input flows to agents and how streaming responses are parsed and rendered.
*   **[Electron Packaging & Server Management](./docs/electron_packaging.md)**: How the web app and Python backend are bundled into a single desktop executable.
*   **[Testing Strategy](./ARCHITECTURE.md#testing-strategy)**: Our approach to quality assurance, including test colocation and tools.

### Chapter 2: Core Entities (The "Brain")
The primary actors and capabilities within the system.

*   **[Agent Management](./docs/agent_management.md)**: How single agents are defined, configured, and managed.
*   **[Agent Teams](./docs/agent_teams.md)**: Orchestrating multiple agents to work together in workflows.
*   **[Skills](./docs/skills.md)**: Reusable, file-based capabilities (scripts) that agents can learn.
*   **[Tools & MCP](./docs/tools_and_mcp.md)**: External tools and the Model Context Protocol (MCP) integration for expanding agent capabilities.
*   **[Prompt Engineering](./docs/prompt_engineering.md)**: Managing the system prompts that define agent personas and behaviors.

### Chapter 3: Interface & Environment (The "Body")
The tools and environments where agents live and users interact.

*   **[File Explorer](./docs/file_explorer.md)**: The file system interface, workspace management, and real-time synchronization.
*   **[Terminal](./docs/terminal.md)**: The integrated terminal emulator for executing system commands.
*   **[Content Rendering](./docs/content_rendering.md)**: How the system displays rich content like Markdown, Code, and Mermaid diagrams.
*   **[Settings](./docs/settings.md)**: Application configuration, API key management, and system monitoring.

---

## 🛠️ Developer Guidelines

### Git Guidelines
*   **NEVER use `git add .` or `git add -A`**. Always stage files individually or by specific patterns to avoid committing unintended changes.

### Testing Overview
We follow a **colocated testing strategy** where tests live alongside the code in `__tests__` directories.
*   **Philosophy**: See **[Testing Strategy in Architecture](./ARCHITECTURE.md#testing-strategy)**.
*   **Key Commands**:
    *   `pnpm test`: Run all tests (Nuxt + Electron).
    *   `pnpm test:nuxt`: Run only web/frontend tests (Recommended). **Always include `--run` to avoid watch mode timeouts**.
    *   `pnpm test:electron`: Run only Electron-specific tests.
    *   `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts --no-watch`: Run a single server test file.
    *   *Note: Always use `--run` (e.g., `pnpm test:nuxt path/to/test --run`) to execute once without watch mode.*
*   **Full Guide**: See **[Testing in README](./README.md#testing)**.

### Project Structure

- `components/`: Vue components
- `stores/`: Pinia stores
- `utils/`: Helper functions and classes
- `pages/`: Application pages
