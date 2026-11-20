/**
 * The demo's runs (autobyteus-279, REQ-004), ported from the approved design reference (`autobyteus-web-design` 78b51f73:
 * `prototype/source-observation/mobile-world.mjs` and `prototype/ios-demo/iosDemo.ts`, the demo's names). Everything is
 * invented. Every run is on the demo itself: the demo has no other nodes, so no row says "Runs on <node>".
 *
 * Coverage: agents, Teams with members, an Org, delegated work (a task agent, task teams, a member's own task agent);
 * running, idle and stopped runs; an idle run with background tasks.
 */
export type DemoStatus = 'running' | 'idle' | 'offline';

/** A Team or Org member: its member name (the address `/name`), the agent it runs, and the runs it delegated. */
export type DemoMemberSpec = { name: string; agent: string; status: DemoStatus; minutes?: number; delegated?: DemoRunSpec[] };

export type DemoRunSpec =
  | { kind: 'agent'; key: string; agent: string; summary: string; status: DemoStatus; minutes: number; delegated?: DemoRunSpec[] }
  | { kind: 'team'; key: string; team: string; summary: string; status: DemoStatus; minutes: number; members: DemoMemberSpec[] }
  | { kind: 'org'; key: string; org: string; summary: string; status: DemoStatus; minutes: number; members: DemoMemberSpec[] };

const engineeringTeam = (key: string, summary: string, status: DemoStatus, minutes: number,
  [designer, engineer, reviewer]: [DemoStatus, DemoStatus, DemoStatus], engineerDelegated?: DemoRunSpec[], team = 'Software Engineering Team'): DemoRunSpec => ({
  kind: 'team', key, team, summary, status, minutes,
  members: [
    { name: 'solution_designer', agent: 'Solution Designer', status: designer },
    { name: 'implementation_engineer', agent: 'Implementation Engineer', status: engineer, ...(engineerDelegated ? { delegated: engineerDelegated } : {}) },
    { name: 'code_reviewer', agent: 'Code Reviewer', status: reviewer },
  ],
});

/** The run whose conversation shows every kind of content (the showcase). */
export const SHOWCASE_RUN_KEY = 'daily-assistant-1';

/** Top-level runs, newest first (the order the node's run list settles: last activity). */
export const DEMO_RUN_SPECS: DemoRunSpec[] = [
  {
    kind: 'agent', key: 'project-task-manager-1', agent: 'Project Task Manager', summary: 'Dispatch the approved desktop app Tasks', status: 'running', minutes: 2,
    delegated: [
      engineeringTeam('engineering-team-1', 'Image context files don’t reach the model on the first turn', 'running', 4, ['idle', 'running', 'idle'], [
        // A task agent started by a team member sits under the member, as on the desktop.
        { kind: 'agent', key: 'code-searcher-1', agent: 'Code Searcher', summary: 'Find where context files are attached', status: 'running', minutes: 1 },
      ]),
      { kind: 'agent', key: 'agent-package-creator-1', agent: 'Agent Package Creator', summary: 'Package the release-notes agent for the agent store', status: 'idle', minutes: 9 },
      engineeringTeam('engineering-team-2', 'Members of a delegated team can’t reach the package creator', 'idle', 18, ['idle', 'idle', 'idle']),
      {
        kind: 'team', key: 'marketing-team-1', team: 'Marketing Team', summary: 'Plan the 1.6 launch campaign across email, social and the website', status: 'running', minutes: 6,
        members: [
          { name: 'campaign_lead', agent: 'Campaign Lead', status: 'running' },
          { name: 'copywriter', agent: 'Copywriter', status: 'idle' },
          { name: 'designer', agent: 'Designer', status: 'idle' },
        ],
      },
      { kind: 'agent', key: 'market-researcher-1', agent: 'Market Researcher', summary: 'Compare competitor pricing pages for the desktop app', status: 'idle', minutes: 31 },
      {
        kind: 'team', key: 'support-team-1', team: 'Support Team', summary: 'Triage the open desktop support threads', status: 'offline', minutes: 45,
        members: [
          { name: 'triage_lead', agent: 'Triage Lead', status: 'offline' },
          { name: 'answer_writer', agent: 'Answer Writer', status: 'offline' },
        ],
      },
    ],
  },
  { kind: 'agent', key: SHOWCASE_RUN_KEY, agent: 'Daily Assistant', summary: 'Summarize the 1.6 release notes for the pilot customers', status: 'idle', minutes: 6 },
  {
    kind: 'org', key: 'product-launch-org-1', org: 'Product Launch Org', summary: 'Prepare the 1.6 launch', status: 'running', minutes: 24,
    members: [
      { name: 'launch_lead', agent: 'Launch Lead', status: 'running', minutes: 24 },
      { name: 'content_writer', agent: 'Content Writer', status: 'idle', minutes: 40 },
      { name: 'release_manager', agent: 'Release Manager', status: 'idle', minutes: 52 },
    ],
  },
  { kind: 'agent', key: 'personal-assistant-1', agent: 'Personal Assistant', summary: 'Plan the week: school pickups, dentist, budget review', status: 'offline', minutes: 55 },
  { kind: 'agent', key: 'codex-1', agent: 'Codex', summary: 'Fix the failing probe test on the base branch', status: 'offline', minutes: 5 * 60 },
  { kind: 'agent', key: 'writing-coach-1', agent: 'Writing Coach', summary: 'Tighten the opening of the pilot email', status: 'offline', minutes: 9 * 60 },
  // A-07 (the design reference's demo names): the older runs are other agents and Teams with their own work.
  engineeringTeam('billing-team-1', 'Review the invoice export migration', 'offline', 26 * 60, ['offline', 'offline', 'offline'], undefined, 'Billing Team'),
  { kind: 'agent', key: 'weekly-planner-1', agent: 'Weekly Planner', summary: 'Which Tasks are blocked this week?', status: 'offline', minutes: 2 * 24 * 60 },
  { kind: 'agent', key: 'agent-package-creator-2', agent: 'Agent Package Creator', summary: 'Make a Product Video Producer package for the marketing team', status: 'offline', minutes: 3 * 24 * 60 },
  { kind: 'agent', key: 'travel-planner-1', agent: 'Travel Planner', summary: 'Compare two flights to Berlin for the March trip', status: 'offline', minutes: 4 * 24 * 60 },
  { kind: 'agent', key: 'refactoring-assistant-1', agent: 'Refactoring Assistant', summary: 'Rename the export helpers and update the imports', status: 'offline', minutes: 5 * 24 * 60 },
  engineeringTeam('documentation-team-1', 'Simplify the NFS Guide and remove redundant steps', 'offline', 6 * 24 * 60, ['offline', 'offline', 'offline'], undefined, 'Documentation Team'),
  { kind: 'agent', key: 'contract-reader-1', agent: 'Contract Reader', summary: 'Summarize the lease renewal and list what to ask the landlord', status: 'offline', minutes: 8 * 24 * 60 },
];
