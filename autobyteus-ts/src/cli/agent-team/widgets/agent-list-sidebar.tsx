import React from 'react';
import { Box, Text } from 'ink';
import { AgentStatus } from '../../../agent/status/status-enum.js';
import { AgentTeamStatus } from '../../../agent-team/status/agent-team-status.js';
import { AGENT_STATUS_ICONS, TEAM_STATUS_ICONS, SUB_TEAM_ICON, TEAM_ICON, DEFAULT_ICON } from './shared.js';
import { Logo } from './logo.js';

export type SidebarNode = {
  type: 'team' | 'subteam' | 'agent';
  name: string;
  role?: string | null;
  children: Record<string, SidebarNode>;
};

type NodeItem = {
  name: string;
  type: SidebarNode['type'];
  role?: string | null;
  depth: number;
  node: SidebarNode;
};

const flattenTree = (tree: Record<string, SidebarNode>, depth = 0): NodeItem[] => {
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

const labelForNode = (
  node: NodeItem,
  agentStatuses: Record<string, AgentStatus>,
  teamStatuses: Record<string, AgentTeamStatus>,
  speakingAgents: Record<string, boolean>
): string => {
  if (node.type === 'agent') {
    const status = agentStatuses[node.name] ?? AgentStatus.UNINITIALIZED;
    const icon = speakingAgents[node.name] ? '🔊' : AGENT_STATUS_ICONS[status] ?? DEFAULT_ICON;
    return `${icon} ${node.name}`;
  }

  const status = teamStatuses[node.name] ?? AgentTeamStatus.UNINITIALIZED;
  const defaultIcon = node.type === 'team' ? TEAM_ICON : SUB_TEAM_ICON;
  const icon = TEAM_STATUS_ICONS[status] ?? defaultIcon;
  if (node.role && node.role !== node.name) {
    return `${icon} ${node.role} (${node.name})`;
  }
  return `${icon} ${node.role ?? node.name}`;
};

export const AgentListSidebar: React.FC<{
  treeData: Record<string, SidebarNode>;
  selectedIndex: number;
  agentStatuses: Record<string, AgentStatus>;
  teamStatuses: Record<string, AgentTeamStatus>;
  speakingAgents: Record<string, boolean>;
  height?: number;
  width?: number;
}> = ({ treeData, selectedIndex, agentStatuses, teamStatuses, speakingAgents, height, width }) => {
  const nodes = flattenTree(treeData);

  return (
    <Box flexDirection="column" width={width ?? 32} borderStyle="round" padding={1} height={height}>
      <Text>Nodes</Text>
      {nodes.length === 0 ? (
        <Text dimColor>Initializing agent team...</Text>
      ) : (
        nodes.map((node, index) => {
          const isSelected = index === selectedIndex;
          const indent = '  '.repeat(node.depth);
          const label = labelForNode(node, agentStatuses, teamStatuses, speakingAgents);
          const prefix = isSelected ? '>' : ' ';
          return (
            <Text key={`${node.name}-${node.type}`}>
              {prefix} {indent}
              {label}
            </Text>
          );
        })
      )}
      <Logo />
    </Box>
  );
};
