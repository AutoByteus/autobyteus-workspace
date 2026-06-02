export interface TaskAgentIdentityPayload {
  task_agent_instance_id?: string;
  taskAgentInstanceId?: string;
  task_agent_run_id?: string;
  taskAgentRunId?: string;
  task_id?: string;
  taskId?: string;
}

export interface TeamStreamIdentityPayload extends TaskAgentIdentityPayload {
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
