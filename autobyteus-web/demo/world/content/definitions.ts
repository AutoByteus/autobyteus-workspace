/**
 * What the demo's agents, Teams and Orgs say about themselves (autobyteus-279): the descriptions New run and the run
 * screens show. Invented; one short sentence each.
 */
export const DEMO_DESCRIPTIONS: Record<string, string> = {
  'Project Task Manager': 'Turns approved Tasks into work for agents and Teams, and keeps track of them.',
  'Daily Assistant': 'Helps with everyday writing, planning and summaries.',
  'Agent Package Creator': 'Packages an agent so others can install it.',
  'Market Researcher': 'Compares products, prices and positioning.',
  'Code Searcher': 'Finds where something happens in a codebase.',
  'Solution Designer': 'Turns a request into requirements and a design.',
  'Implementation Engineer': 'Builds the approved design and tests it.',
  'Code Reviewer': 'Reviews a change for correctness before it ships.',
  'Campaign Lead': 'Plans a launch campaign and keeps the team on schedule.',
  'Copywriter': 'Writes the campaign’s posts, emails and pages.',
  'Designer': 'Makes the campaign’s banners and pictures.',
  'Triage Lead': 'Sorts incoming support threads by urgency.',
  'Answer Writer': 'Drafts clear answers to support threads.',
  'Launch Lead': 'Coordinates a product launch across the organization.',
  'Content Writer': 'Writes the launch announcement and the notes.',
  'Release Manager': 'Checks that a release is ready and ships it.',
  'Personal Assistant': 'Keeps track of the week: appointments, errands and reminders.',
  'Codex': 'Writes and fixes code in the workspace.',
  'Writing Coach': 'Makes a draft clearer and shorter.',
  'Weekly Planner': 'Plans the week’s Tasks and spots what is blocked.',
  'Travel Planner': 'Compares trips, flights and hotels.',
  'Refactoring Assistant': 'Renames and restructures code safely.',
  'Contract Reader': 'Summarizes a contract and lists the questions to ask.',
  'Software Engineering Team': 'Designs, builds and reviews a software change.',
  'Marketing Team': 'Plans and produces a launch campaign.',
  'Support Team': 'Answers support threads.',
  'Billing Team': 'Looks after invoicing and billing changes.',
  'Documentation Team': 'Keeps the guides short and correct.',
  'Product Launch Org': 'Prepares a product launch end to end.',
};

export const descriptionOf = (name: string): string => DEMO_DESCRIPTIONS[name] ?? `${name}, a sample of the demo.`;
