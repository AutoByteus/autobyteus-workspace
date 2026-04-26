import type {
  ChannelBinding,
  ChannelOutputRoute,
  ChannelRunOutputTarget,
} from "../domain/models.js";

export type ChannelRunOutputLink = {
  linkKey: string;
  binding: ChannelBinding;
  route: ChannelOutputRoute;
  target: ChannelRunOutputTarget;
  latestCorrelationMessageId: string | null;
  unsubscribe: (() => void) | null;
};

export class ChannelRunOutputLinkRegistry {
  private readonly links = new Map<string, ChannelRunOutputLink>();

  upsert(input: Omit<ChannelRunOutputLink, "linkKey">): ChannelRunOutputLink {
    const linkKey = buildLinkKey(input.binding.id, input.target);
    const existing = this.links.get(linkKey);
    if (existing?.unsubscribe && existing.unsubscribe !== input.unsubscribe) {
      safeUnsubscribe(existing.unsubscribe);
    }
    const link: ChannelRunOutputLink = {
      ...input,
      linkKey,
    };
    this.links.set(linkKey, link);
    return link;
  }

  getByLinkKey(linkKey: string): ChannelRunOutputLink | null {
    return this.links.get(linkKey) ?? null;
  }

  list(): ChannelRunOutputLink[] {
    return [...this.links.values()];
  }

  detachLink(linkKey: string): void {
    const existing = this.links.get(linkKey);
    if (!existing) {
      return;
    }
    this.links.delete(linkKey);
    if (existing.unsubscribe) {
      safeUnsubscribe(existing.unsubscribe);
    }
  }

  detachBinding(bindingId: string): void {
    for (const link of this.list()) {
      if (link.binding.id === bindingId) {
        this.detachLink(link.linkKey);
      }
    }
  }

  clear(): void {
    for (const link of this.list()) {
      this.detachLink(link.linkKey);
    }
  }
}

export const buildLinkKey = (
  bindingId: string,
  target: ChannelRunOutputTarget,
): string => {
  if (target.targetType === "AGENT") {
    return `binding:${bindingId}:agent:${target.agentRunId}`;
  }
  return `binding:${bindingId}:team:${target.teamRunId}`;
};

const safeUnsubscribe = (unsubscribe: () => void): void => {
  try {
    unsubscribe();
  } catch {
    // ignore cleanup failures
  }
};
