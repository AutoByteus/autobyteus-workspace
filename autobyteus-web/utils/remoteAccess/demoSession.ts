/**
 * The demo's phone session (autobyteus-279), in every build: the one fact the phone shell reads to know it shows the demo.
 * The demo build's boot (`demo/demoBoot.ts`) stores a session with this entry id; the run list and the connection sheet
 * then show the demo node, its welcome card and Leave demo. Nothing else marks the demo, and the node's contract has no
 * demo field (design R-3).
 */
export const DEMO_ENTRY_ID = 'demo';

export const isDemoSession = (session: { entryId?: string | null } | null | undefined): boolean => session?.entryId === DEMO_ENTRY_ID;
