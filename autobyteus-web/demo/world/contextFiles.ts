/**
 * The files the user attaches in the demo (autobyteus-279, REQ-005: an attached file is named in the reply), kept in
 * memory as the node keeps them on disk (`context-files/`): a draft under its owner, then the final file under its run once
 * the message is sent. Locators are the node's (`context-file-owner-types.ts`), so the phone reads them as it reads a
 * node's. Nothing is persisted: Leave demo forgets them.
 */
export type DemoDraftOwner =
  | { kind: 'agent_draft'; draftRunId: string }
  | { kind: 'team_member_draft'; teamDraftId: string; memberAddress: string }
  | { kind: 'org_member_draft'; orgRunId: string; agentRunId: string };
export type DemoFinalOwner =
  | { kind: 'agent_final'; runId: string }
  | { kind: 'team_member_final'; teamRunId: string; agentRunId: string }
  | { kind: 'org_member_final'; orgRunId: string; agentRunId: string };

export type DemoContextFile = Readonly<{ storedFilename: string; displayName: string; mimeType: string; bytes: ArrayBuffer }>;
export type DemoAttachment = Readonly<{ storedFilename: string; displayName: string; locator: string; phase: 'draft' | 'final' }>;

const e = encodeURIComponent;

const draftLocator = (owner: DemoDraftOwner, storedFilename: string): string => {
  const ownerPath = owner.kind === 'agent_draft' ? `agent-runs/${e(owner.draftRunId)}`
    : owner.kind === 'team_member_draft' ? `team-runs/${e(owner.teamDraftId)}/members/${e(owner.memberAddress)}`
      : `agent-org-runs/${e(owner.orgRunId)}/agent-runs/${e(owner.agentRunId)}`;
  return `/rest/drafts/${ownerPath}/context-files/${e(storedFilename)}`;
};

const finalLocator = (owner: DemoFinalOwner, storedFilename: string): string => (owner.kind === 'agent_final'
  ? `/rest/runs/${e(owner.runId)}/context-files/${e(storedFilename)}`
  : owner.kind === 'team_member_final'
    ? `/rest/team-runs/${e(owner.teamRunId)}/agent-runs/${e(owner.agentRunId)}/context-files/${e(storedFilename)}`
    : `/rest/agent-org-runs/${e(owner.orgRunId)}/agent-runs/${e(owner.agentRunId)}/context-files/${e(storedFilename)}`);

/** The node's stored name (`buildStoredFilename`): a token, the name's safe stem and its extension. */
const storedFilenameOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : name).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '').slice(0, 80) || 'file';
  const extension = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase() : '';
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `ctx_${token}__${stem}${extension ? `.${extension}` : ''}`;
};

export class DemoContextFiles {
  private readonly files = new Map<string, DemoContextFile>();

  async upload(owner: DemoDraftOwner, file: File): Promise<DemoAttachment> {
    const storedFilename = storedFilenameOf(file.name);
    const locator = draftLocator(owner, storedFilename);
    this.files.set(locator, { storedFilename, displayName: file.name, mimeType: file.type || 'application/octet-stream', bytes: await file.arrayBuffer() });
    return { storedFilename, displayName: file.name, locator, phase: 'draft' };
  }

  /** The drafts move to their run: each one's final locator (a draft already moved keeps its final file). */
  finalize(draftOwner: DemoDraftOwner, finalOwner: DemoFinalOwner, attachments: ReadonlyArray<{ storedFilename: string; displayName: string }>): DemoAttachment[] {
    return attachments.map(({ storedFilename, displayName }) => {
      const draft = draftLocator(draftOwner, storedFilename);
      const locator = finalLocator(finalOwner, storedFilename);
      const file = this.files.get(draft);
      if (file) { this.files.set(locator, file); this.files.delete(draft); }
      if (!this.files.has(locator)) throw new Error(`Context file '${storedFilename}' was not found.`);
      return { storedFilename, displayName: displayName || this.files.get(locator)!.displayName, locator, phase: 'final' };
    });
  }

  read(locator: string): DemoContextFile | null { return this.files.get(locator) ?? null; }

  delete(locator: string): boolean { return this.files.delete(locator); }

  /** The name the user gave a file, by its locator (a reply names it); null for a locator the demo does not hold. */
  displayNameOf(locator: string): string | null {
    const path = locator.startsWith('/') ? locator : (() => { try { return new URL(locator).pathname; } catch { return locator; } })();
    return this.files.get(path)?.displayName ?? null;
  }
}
