export interface TaskAgentIdentityPayload {
  execution_kind?: 'task_agent' | 'task_team' | string;
  executionKind?: 'task_agent' | 'task_team' | string;
  task_agent_instance_id?: string;
  taskAgentInstanceId?: string;
  task_agent_run_id?: string;
  taskAgentRunId?: string;
  task_id?: string;
  taskId?: string;
}

export interface TaskTeamIdentityPayload {
  task_team_instance_id?: string;
  taskTeamInstanceId?: string;
  task_team_run_id?: string;
  taskTeamRunId?: string;
  team_route_key?: string;
  teamRouteKey?: string;
  team_path?: string[];
  teamPath?: string[];
  task_team_relative_member_route_key?: string;
  taskTeamRelativeMemberRouteKey?: string;
  task_team_relative_member_path?: string[];
  taskTeamRelativeMemberPath?: string[];
}

export interface TeamStreamIdentityPayload extends TaskAgentIdentityPayload, TaskTeamIdentityPayload {
  agent_id?: string;
  agentId?: string;
  agent_name?: string;
  agentName?: string;
  member_route_key?: string;
  memberRouteKey?: string;
  member_path?: string[];
  memberPath?: string[];
  source_route_key?: string;
  sourceRouteKey?: string;
  source_path?: string[];
  sourcePath?: string[];
}
