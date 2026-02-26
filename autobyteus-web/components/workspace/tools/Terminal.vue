<template>
  <div class="terminal-container h-full flex flex-col" ref="terminalContainer">
    <div v-if="session.errorMessage.value" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 mb-2">
      <p class="text-sm">{{ session.errorMessage.value }}</p>
      <button @click="connectTerminal" class="text-xs underline mt-1">Retry Connection</button>
    </div>
    <div ref="terminalElement" class="flex-1 w-full relative overflow-hidden"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, markRaw, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useWorkspaceStore } from '~/stores/workspace';
import { useTerminalSession }
from '~/composables/useTerminalSession';

const terminalContainer = ref<HTMLDivElement | null>(null);
const terminalElement = ref<HTMLDivElement | null>(null);
const terminalInstance = shallowRef<Terminal | null>(null);
const fitAddon = shallowRef<FitAddon | null>(null);

const workspaceStore = useWorkspaceStore();

// Initialize the terminal session composable
const session = useTerminalSession({
  workspaceId: computed(() => workspaceStore.activeWorkspace?.workspaceId || '')
});

let resizeObserver: ResizeObserver | null = null;
let initScheduled = false;
let pendingConnect = false;

const safeFit = () => {
  if (!fitAddon.value || !terminalElement.value || !terminalInstance.value) {
    return;
  }
  const { clientWidth, clientHeight } = terminalElement.value;
  if (clientWidth === 0 || clientHeight === 0) {
    return;
  }
  try {
    fitAddon.value.fit();
  } catch (error) {
    console.warn('[Terminal] Fit skipped:', error);
  }
};

const scheduleInitializeTerminal = () => {
  if (terminalInstance.value || initScheduled) {
    return;
  }
  initScheduled = true;

  const attempt = () => {
    if (terminalInstance.value) {
      initScheduled = false;
      return;
    }
    if (!terminalElement.value) {
      requestAnimationFrame(attempt);
      return;
    }
    const { clientWidth, clientHeight } = terminalElement.value;
    if (clientWidth === 0 || clientHeight === 0) {
      requestAnimationFrame(attempt);
      return;
    }
    initScheduled = false;
    initializeTerminal();
    if (pendingConnect) {
      pendingConnect = false;
      if (workspaceStore.activeWorkspace?.workspaceId) {
        session.connect();
      }
    }
  };

  requestAnimationFrame(attempt);
};

const initializeTerminal = () => {
  if (terminalInstance.value) {
    return;
  }
  if (!terminalElement.value) return;

  // High-Contrast Light Theme Configuration
  terminalInstance.value = markRaw(new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar', // 'block' | 'underline' | 'bar'
    // standard monospaced fonts for "normal" look
    fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.4,
    letterSpacing: 0,
    fontWeight: 'normal',
    fontWeightBold: 'bold',
    theme: {
      background: '#ffffff', // Pure White
      foreground: '#000000', // Pitch Black for maximum text contrast
      cursor: '#000000',     
      selectionBackground: '#b4d5fe', // More visible selection
      
      // ANSI Colors - Ultra High Contrast for Light Mode
      // All colors significantly darkened to ensure sharp text
      
      black: '#000000',
      red: '#a80000',        // Dark Red
      green: '#005f00',      // Dark Green
      yellow: '#7f7f00',     // Dark Yellow
      blue: '#0000aa',       // Dark Blue (Navy)
      magenta: '#7f007f',    // Dark Magenta
      cyan: '#005f5f',       // Dark Cyan (Teal)
      white: '#333333',      // Dark Grey (replacing white)
      
      // Bright variants (also dark for visibility)
      brightBlack: '#444444',
      brightRed: '#d70000',
      brightGreen: '#008700',
      brightYellow: '#afaf00',
      brightBlue: '#0000d7',
      brightMagenta: '#af00af',
      brightCyan: '#008787',
      brightWhite: '#000000' // Black
    },
    scrollback: 5000,
    allowProposedApi: true,
    // CRITICAL FIX: Transparency false enables subpixel anti-aliasing (RGB) for sharper text
    allowTransparency: false 
  }));

  // Addons
  fitAddon.value = markRaw(new FitAddon());
  terminalInstance.value.loadAddon(fitAddon.value);
  
  // NOTE: WebGL Addon removed as it was causing text blurriness/aliasing issues.
  // Standard Canvas renderer provides sharper text.

  // Mount terminal
  terminalInstance.value.open(terminalElement.value);
  
  // Initial fit
  nextTick(() => {
    safeFit();
  });

  // Handle Input: Send data to WebSocket
  terminalInstance.value.onData((data) => {
    if (session.isConnected.value) {
      session.sendInput(data);
    }
  });

  // Handle Resize: Send new dimensions to backend
  terminalInstance.value.onResize((size) => {
    if (session.isConnected.value) {
      session.sendResize(size.rows, size.cols);
    }
  });

  // Handle Output: Receive data from WebSocket
  session.onOutput((data) => {
    terminalInstance.value?.write(data);
  });
  
  // Clear welcome message - Simple Bold Black text
  terminalInstance.value.writeln('\x1b[1m➜ Connected to Workspace Terminal\x1b[0m');
};

const connectTerminal = () => {
  if (!terminalInstance.value) {
    pendingConnect = true;
    scheduleInitializeTerminal();
    return;
  }
  if (workspaceStore.activeWorkspace?.workspaceId) {
    session.connect();
  }
};

const handleWindowResize = () => {
  safeFit();
};

onMounted(() => {
  scheduleInitializeTerminal();
  connectTerminal();

  // Watch for workspace changes to reconnect
  watch(() => workspaceStore.activeWorkspace?.workspaceId, (newId) => {
    if (newId) {
      session.disconnect();
      // Small delay to ensure clean disconnect before reconnecting
      setTimeout(() => session.connect(), 100);
    }
  });

  // Setup resize observer for the container
  if (terminalContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      scheduleInitializeTerminal();
      safeFit();
    });
    resizeObserver.observe(terminalContainer.value);
  }
  
  // Also listen for window resize
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  session.disconnect();
  
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('resize', handleWindowResize);
  
  try {
    if (terminalInstance.value) {
        terminalInstance.value.dispose();
    }
  } catch (e) {
      console.warn('Error disposing terminal:', e);
  }

  fitAddon.value = null;
  terminalInstance.value = null;
});
</script>

<style scoped>
.terminal-container {
  min-height: 0;
  background-color: #ffffff;
}

/* Ensure xterm fills the container */
:deep(.xterm), :deep(.xterm-viewport), :deep(.xterm-screen) {
  width: 100% !important;
  height: 100% !important;
}

/* Scrollbar styling - Sleek Light */
.terminal-container ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.terminal-container ::-webkit-scrollbar-track {
  background: #ffffff; 
}

.terminal-container ::-webkit-scrollbar-thumb {
  background: #cccccc; 
  border-radius: 4px;
}

.terminal-container ::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

.terminal-container ::-webkit-scrollbar-corner {
  background: #ffffff;
}

.xterm {
  padding: 16px 0 0 16px; 
}
</style>
