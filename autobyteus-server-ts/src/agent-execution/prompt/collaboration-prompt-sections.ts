import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";

/**
 * The collaboration sections of an agent's prompt, written for the agent (ticket
 * collaboration-prompt-wording; wording authority §4.1, §4.2, §5.0-§5.3). One owner of the text
 * and of which agent gets which section; the role comes from the member context, never from
 * addresses. No section states the agent's own address: an agent uses the addresses it is given
 * and answers by ID.
 */

/** §4.1: an agent the user started on its own. */
const STANDALONE_AGENT_SECTION = [
  "## Working With Other Agents",
  "",
  "You can delegate tasks to other agents and agent teams.",
  "",
  "- To delegate a task, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its ID. Your task description becomes the task agent's first message, together with your ID so it can reply; don't send it again with `send_message_to`.",
  "- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.",
  "- To talk with a task agent, use `send_message_to` with its ID. It talks back to you the same way. For a task agent team you get two IDs: talk with the team through its coordinator's ID (`target_team_coordinator_agent_run_id`).",
  "- Every message you receive names its sender and gives its ID. To answer it, use `send_message_to` with that ID.",
  "- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.",
  "- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.",
  "",
  "On receiving a request, follow your own instructions and skills. Use `send_message_to` for a purpose: to follow up with a task agent, or to answer one. Don't send acknowledgements, status chatter or promises to work.",
].join("\n");

/** §4.2: an agent that another agent delegated a task to, outside any team. */
const TASK_AGENT_SECTION = [
  "## Working With Other Agents",
  "",
  "You are a task agent: another agent delegated a task to you. That agent's ID is in the task message. When you finish, or need something you can't get yourself, tell that agent using `send_message_to` with its ID.",
  "",
  "You can also delegate tasks to other agents and agent teams.",
  "",
  "- To delegate a task, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its ID. Your task description becomes the task agent's first message, together with your ID so it can reply; don't send it again with `send_message_to`.",
  "- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.",
  "- To talk with a task agent, use `send_message_to` with its ID. It talks back to you the same way. For a task agent team you get two IDs: talk with the team through its coordinator's ID (`target_team_coordinator_agent_run_id`).",
  "- Every message you receive names its sender and gives its ID. To answer it, use `send_message_to` with that ID.",
  "- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.",
  "- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.",
  "",
  "On receiving a request, follow your own instructions and skills. Use `send_message_to` for a purpose: to report your result, to ask for input you need, or to follow up with or answer one of your task agents. Don't send acknowledgements, status chatter or promises to work.",
].join("\n");

/** §5.0: how addresses work, for team and organization agents. */
const AGENT_TEAM_ADDRESSING_SECTION = [
  "## AgentTeam Addressing",
  "",
  "Agents and agent teams use filesystem-like logical addresses. Think of the top level as a directory, an Agent as a file, and an AgentTeam as a subdirectory that contains Agents. This analogy describes the structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "The top level is represented by `/`. Its display or metadata name is not included in any address. An AgentTeam contains Agents only; a team is never inside another team. So an address has one level, such as `/A`, or two, such as `/C/D`.",
  "",
  "The following example illustrates the address structure:",
  "",
  "/",
  "├── /A              (Agent)",
  "├── /B              (Agent)",
  "└── /C              (AgentTeam)",
  "    ├── /C/D         (Agent)",
  "    └── /C/E         (Agent)",
  "",
  "In this example:",
  "",
  "- `/A` and `/B` are Agents at the top level.",
  "- `/C` is an AgentTeam at the top level.",
  "- `/C/D` and `/C/E` are Agents inside AgentTeam `/C`.",
  "- Each `/` separates one parent-to-child level.",
  "",
  "The letters in this example are placeholders only. They do not identify available recipients. Use only an exact address you were given, for example in your handoff rules, your team instruction, the result of `list_available_agents` or the note about agents the user mentioned.",
  "",
  "Every Agent and AgentTeam you can reach by address has one canonical absolute address beginning with `/`. Use that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and `/` itself are not valid recipients. A task agent or task agent team that you create by delegating can't be reached by address: talk with it using its ID.",
  "",
  "Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.",
].join("\n");

/** §5.1: a member of an agent team; the organization line is filled by the renderer. */
const TEAM_MEMBER_SECTION = [
  "## Working With Other Agents",
  "",
  "On receiving a request, follow your own instructions and skills.",
  "",
  "- To talk with a teammate, use `send_message_to` with their address.{{organization_line}}",
  "- To get a task done outside your team, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its ID. Your task description becomes the task agent's first message, together with your ID so it can reply; don't send it again with `send_message_to`.",
  "- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.",
  "- To talk with a task agent, use `send_message_to` with its ID. It talks back to you the same way. For a task agent team you get two IDs: talk with the team through its coordinator's ID (`target_team_coordinator_agent_run_id`).",
  "- Every message you receive names its sender and gives its ID. To answer it, use `send_message_to` with that ID.",
  "- Don't delegate to yourself, your teammates or your own team; talk with them instead.",
  "- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.",
  "- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.",
  "",
  "Use `send_message_to` for a purpose: to hand off your work, to ask for input you need, to follow up with or answer one of your task agents, or to reply to the agent that gave you a task (by its ID). Don't send acknowledgements, status chatter or promises to work.",
].join("\n");

/** §5.2: a direct agent of an organization. */
const ORG_AGENT_SECTION = [
  "## Working With Other Agents",
  "",
  "On receiving a request, follow your own instructions and skills.",
  "",
  "- To talk with an agent or agent team of your organization, use `send_message_to` with its address.",
  "- To have a task done by a new agent, use `delegate_task` with the address of an agent or agent team. This creates a new task agent (or task agent team) that works on your task, and you get back its ID. Even when an agent of your organization has that address, delegating creates a new task agent; it doesn't give the task to that agent. Your task description becomes the task agent's first message, together with your ID so it can reply; don't send it again with `send_message_to`.",
  "- Every delegation to an address creates a new task agent or task agent team, so you can delegate several tasks at the same time.",
  "- To talk with a task agent, use `send_message_to` with its ID. It talks back to you the same way. For a task agent team you get two IDs: talk with the team through its coordinator's ID (`target_team_coordinator_agent_run_id`).",
  "- Every message you receive names its sender and gives its ID. To answer it, use `send_message_to` with that ID.",
  "- Don't delegate to yourself.",
  "- `list_available_agents`, if you have it, shows the agents and agent teams you can work with, with their addresses.",
  "- If the user mentions agents or agent teams, they are listed at the end of the user's message; follow that note.",
  "",
  "Use `send_message_to` for a purpose: to hand off your work, to ask for input you need, to follow up with or answer one of your task agents, or to reply to the agent that gave you a task (by its ID). Don't send acknowledgements, status chatter or promises to work.",
].join("\n");

/** §5.3: added only for an agent that has handoff rules. */
const HANDOFFS_SECTION = [
  "### Handoffs",
  "",
  "When you finish your work or get stuck, call `get_handoff_rules`. Select the single rule whose `when` condition most specifically matches your outcome, and message only its `recipient_address` with `send_message_to`. Don't notify anyone else about the same outcome. If no rule fits and another agent gave you the task, tell that agent using its ID; otherwise finish normally.",
].join("\n");

const ORGANIZATION_LINE = " You can also talk with the organization's other agents and agent teams at their addresses.";

const withOrganizationLine = (section: string, inOrganization: boolean): string =>
  section.replace("{{organization_line}}", () => (inOrganization ? ORGANIZATION_LINE : ""));

/**
 * The text of the collaboration sections for this agent, in prompt order: the addressing section
 * (team and organization agents), then "Working With Other Agents", then "Handoffs" when the agent
 * has handoff rules. The authored Team Instruction, whenever the agent has one, goes between
 * the identity and these sections and is added by the composer.
 */
export const renderCollaborationSections = (context: MemberExecutionContext): string => {
  const inOrganization = context.identity.root.rootSubjectKind === "agent_org";
  const parts: string[] = [];
  switch (context.collaborationRole) {
    case "standalone_agent":
      parts.push(STANDALONE_AGENT_SECTION);
      break;
    case "task_agent":
      parts.push(TASK_AGENT_SECTION);
      break;
    case "team_member":
      parts.push(AGENT_TEAM_ADDRESSING_SECTION, withOrganizationLine(TEAM_MEMBER_SECTION, inOrganization));
      break;
    case "org_agent":
      parts.push(AGENT_TEAM_ADDRESSING_SECTION, ORG_AGENT_SECTION);
      break;
  }
  if (context.collaboration.outgoingHandoffs.length > 0) parts.push(HANDOFFS_SECTION);
  return parts.join("\n\n");
};
