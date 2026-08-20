import { EMBEDDED_NODE_ID, type WindowNodeContext } from '~/types/node';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

function defaultEmbeddedContext(): WindowNodeContext {
  return {
    windowId: 0,
    nodeId: EMBEDDED_NODE_ID,
  };
}

export default defineNuxtPlugin(async () => {
  if (!process.client) {
    return;
  }

  const nodeStore = useNodeStore();
  const windowNodeContextStore = useWindowNodeContextStore();

  await nodeStore.initializeRegistry();

  let context = defaultEmbeddedContext();
  if (window.electronAPI?.getWindowContext) {
    try {
      context = await window.electronAPI.getWindowContext();
    } catch (error) {
      throw new Error(
        `[windowNodeBootstrap] Failed to fetch Electron window context: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const boundNode = nodeStore.getNodeById(context.nodeId) || nodeStore.getNodeById(EMBEDDED_NODE_ID);
  if (!boundNode) {
    throw new Error('No embedded node available in node registry.');
  }

  windowNodeContextStore.initializeFromWindowContext(context, boundNode.baseUrl);
});
