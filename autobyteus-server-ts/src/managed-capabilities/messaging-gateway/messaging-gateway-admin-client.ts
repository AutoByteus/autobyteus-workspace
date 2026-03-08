type PeerCandidateResponse = {
  items: Array<Record<string, unknown>>;
  updatedAt?: string;
  accountId?: string;
};

export class MessagingGatewayAdminClient {
  async getRuntimeReliabilityStatus(input: {
    host: string;
    port: number;
    adminToken: string;
  }): Promise<Record<string, unknown>> {
    return this.requestJson(
      `http://${input.host}:${input.port}/api/runtime-reliability/v1/status`,
      input.adminToken,
    );
  }

  async getWeComAccounts(input: {
    host: string;
    port: number;
    adminToken: string;
  }): Promise<{ items: Array<Record<string, unknown>> }> {
    return this.requestJson(
      `http://${input.host}:${input.port}/api/channel-admin/v1/wecom/accounts`,
      input.adminToken,
    );
  }

  async getDiscordPeerCandidates(input: {
    host: string;
    port: number;
    adminToken: string;
    accountId?: string | null;
    includeGroups?: boolean;
    limit?: number;
  }): Promise<PeerCandidateResponse> {
    const url = new URL(
      `http://${input.host}:${input.port}/api/channel-admin/v1/discord/peer-candidates`,
    );
    if (input.accountId) {
      url.searchParams.set("accountId", input.accountId);
    }
    if (input.includeGroups !== undefined) {
      url.searchParams.set("includeGroups", String(input.includeGroups));
    }
    if (input.limit !== undefined) {
      url.searchParams.set("limit", String(input.limit));
    }
    return this.requestJson(url.toString(), input.adminToken);
  }

  async getTelegramPeerCandidates(input: {
    host: string;
    port: number;
    adminToken: string;
    accountId?: string | null;
    includeGroups?: boolean;
    limit?: number;
  }): Promise<PeerCandidateResponse> {
    const url = new URL(
      `http://${input.host}:${input.port}/api/channel-admin/v1/telegram/peer-candidates`,
    );
    if (input.accountId) {
      url.searchParams.set("accountId", input.accountId);
    }
    if (input.includeGroups !== undefined) {
      url.searchParams.set("includeGroups", String(input.includeGroups));
    }
    if (input.limit !== undefined) {
      url.searchParams.set("limit", String(input.limit));
    }
    return this.requestJson(url.toString(), input.adminToken);
  }

  private async requestJson<T>(url: string, adminToken: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const payload = await safeReadJson(response);
      const detail =
        typeof payload?.detail === "string"
          ? payload.detail
          : `HTTP ${response.status} ${response.statusText}`;
      throw new Error(detail);
    }
    return (await response.json()) as T;
  }
}

const safeReadJson = async (
  response: Response,
): Promise<Record<string, unknown> | null> => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

