import { getMemorySearch } from "../memory-search/memory-search.js";

/**
 * Startup step 9: memory search follows journal changes and, when the index was built before, catches up with
 * what changed while the server was off. It loads no embedding model (the first search or live update does).
 */
export function startMemorySearch(): void {
  getMemorySearch().start();
}
