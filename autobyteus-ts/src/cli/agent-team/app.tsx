import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';
import { AgentTeam } from '../../agent-team/agent-team.js';
import { AgentTeamEventStream } from '../../agent-team/streaming/agent-team-event-stream.js';
import { AgentInputUserMessage } from '../../agent/message/agent-input-user-message.js';
import { TuiStateStore, type NodeData } from './state-store.js';
import { AgentListSidebar } from './widgets/agent-list-sidebar.js';
import { StatusBar } from './widgets/status-bar.js';
import { FocusPane } from './widgets/focus-pane.js';
import { initializeLogging } from '../../utils/logger.js';

type NodeItem = {
  name: string;
  type: NodeData['type'];
  role?: string | null;
  depth: number;
  node: NodeData;
};

const flattenTree = (tree: Record<string, NodeData>, depth = 0): NodeItem[] => {
  const items: NodeItem[] = [];
  for (const node of Object.values(tree)) {
    items.push({ name: node.name, type: node.type, role: node.role, depth, node });
    const children = Object.values(node.children ?? {});
    if (children.length) {
      items.push(...flattenTree(node.children, depth + 1));
    }
  }
  return items;
};


export const AgentTeamApp: React.FC<{ team: AgentTeam }> = ({ team }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const storeRef = useRef<TuiStateStore | null>(null);
  const [storeVersion, setStoreVersion] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focusedNode, setFocusedNode] = useState<NodeItem | null>(null);
  const [dimensions, setDimensions] = useState(() => {
    const fallback = process.stdout;
    return {
      width: stdout?.columns ?? fallback.columns ?? 80,
      height: stdout?.rows ?? fallback.rows ?? 24
    };
  });

  if (!storeRef.current) {
    storeRef.current = new TuiStateStore(team);
  }
  const store = storeRef.current;

  useEffect(() => {
    const target = stdout ?? process.stdout;
    const update = () => {
      setDimensions({
        width: target.columns ?? 80,
        height: target.rows ?? 24
      });
    };
    update();
    target.on('resize', update);
    return () => {
      target.off('resize', update);
    };
  }, [stdout]);

  useEffect(() => {
    const stream = new AgentTeamEventStream(team);
    let active = true;
    let renderTimer: NodeJS.Timeout | null = null;
    const refreshMsRaw = Number(process.env.AUTOBYTEUS_TUI_REFRESH_MS ?? 200);
    const refreshMs = Number.isFinite(refreshMsRaw)
      ? Math.min(500, Math.max(30, Math.floor(refreshMsRaw)))
      : 200;

    const initialTree = store.getTreeData();
    const root = initialTree[team.name];
    if (root) {
      store.setFocusedNode(root);
      setFocusedNode({ name: root.name, type: root.type, role: root.role, depth: 0, node: root });
    }
    setStoreVersion(store.version);

    (async () => {
      try {
        for await (const event of stream.allEvents()) {
          if (!active) {
            break;
          }
          store.processEvent(event);
        }
      } finally {
        if (active) {
          active = false;
        }
      }
    })();

    renderTimer = setInterval(() => {
      if (!active) {
        return;
      }
      if (store.consumeDirty()) {
        setStoreVersion(store.version);
      }
    }, refreshMs);

    return () => {
      active = false;
      if (renderTimer) {
        clearInterval(renderTimer);
      }
      void stream.close();
      if (team.isRunning) {
        void team.stop();
      }
    };
  }, [team, store]);

  const nodes = useMemo(() => flattenTree(store.getTreeData()), [store, storeVersion]);

  useEffect(() => {
    if (!nodes.length) {
      return;
    }
    const safeIndex = Math.min(selectedIndex, nodes.length - 1);
    if (safeIndex !== selectedIndex) {
      setSelectedIndex(safeIndex);
    }
    const node = nodes[safeIndex];
    store.setFocusedNode(node.node);
    setFocusedNode(node);
  }, [nodes, selectedIndex, store]);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((idx) => Math.max(0, idx - 1));
    } else if (key.downArrow) {
      setSelectedIndex((idx) => Math.min(nodes.length - 1, idx + 1));
    }
  });

  const focused = focusedNode?.node ?? null;
  const focusedType = focused?.type ?? 'team';
  const focusedName = focused?.name ?? team.name;

  const history =
    focusedType === 'agent' ? store.getHistoryForNode(focusedName, focusedType) : [];
  const lastUserMessage =
    focusedType === 'agent' ? store.getLastUserMessage(focusedName) : null;
  const pendingApproval =
    focusedType === 'agent' ? store.getPendingApprovalForAgent(focusedName) : null;
  const taskPlan = focusedType !== 'agent' ? store.getTaskPlanTasks(focusedName) : null;
  const taskStatuses = focusedType !== 'agent' ? store.getTaskPlanStatuses(focusedName) : null;

  const handleSubmitMessage = (agentName: string, text: string): void => {
    store.appendUserMessage(agentName, text);
    void team.postMessage(new AgentInputUserMessage(text), agentName);
  };

  const handleSubmitApproval = (agentName: string, invocationId: string, isApproved: boolean, reason?: string): void => {
    void team.postToolExecutionApproval(agentName, invocationId, isApproved, reason);
    const decisionText = isApproved
      ? `APPROVED${reason ? `: ${reason}` : ''}`
      : `DENIED${reason ? `: ${reason}` : ''}`;
    store.appendToolDecision(agentName, decisionText);
    store.clearPendingApproval(agentName);
    store.version += 1;
    setStoreVersion(store.version);
  };

  const safeWidth = Math.max(40, dimensions.width ?? 0);
  const safeHeight = Math.max(10, dimensions.height ?? 0);
  const headerHeight = 1;
  const statusHeight = 1;
  const verticalPadding = 2;
  const bodyHeight = Math.max(10, safeHeight - headerHeight - statusHeight - verticalPadding);
  const sidebarWidth = 32;
  const innerWidth = Math.max(40, safeWidth - 2);
  const focusWidth = Math.max(20, innerWidth - sidebarWidth);

  return (
    <Box flexDirection="column" padding={1} width={safeWidth} height={safeHeight}>
      <Text>AutoByteus Team Console</Text>
      <Box flexDirection="row" marginTop={1} height={bodyHeight}>
        <AgentListSidebar
          treeData={store.getTreeData()}
          selectedIndex={selectedIndex}
          agentStatuses={store.agentStatuses}
          teamStatuses={store.teamStatuses}
          speakingAgents={store.speakingAgents}
          height={bodyHeight}
          width={sidebarWidth}
        />
        <FocusPane
          focusedNode={focused}
          agentStatuses={store.agentStatuses}
          teamStatuses={store.teamStatuses}
          history={history}
          lastUserMessage={lastUserMessage}
          pendingApproval={pendingApproval}
          tasks={taskPlan}
          taskStatuses={taskStatuses}
          availableHeight={bodyHeight}
          availableWidth={focusWidth}
          onSubmitMessage={handleSubmitMessage}
          onSubmitApproval={handleSubmitApproval}
        />
      </Box>
      <StatusBar />
    </Box>
  );
};

export async function run(team: AgentTeam): Promise<void> {
  if (!team.isRunning) {
    team.start();
  }
  // Switch to alternate screen + clear + hide cursor for a real full-screen TUI.
  process.stdout.write('\x1b[?1049h\x1b[2J\x1b[H\x1b[?25l');
  const instance = render(<AgentTeamApp team={team} />);
  initializeLogging();
  try {
    await instance.waitUntilExit();
  } finally {
    // Restore cursor and original screen buffer.
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  }
}
