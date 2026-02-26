import { describe, expect, it, vi } from 'vitest';
import {
  MessagingGatewayClient,
  GatewayClientError,
} from '~/services/messagingGatewayClient';

function createHttpClientMock() {
  return {
    request: vi.fn(),
  } as any;
}

describe('MessagingGatewayClient', () => {
  it('throws when base URL is missing', async () => {
    const client = new MessagingGatewayClient({
      httpClient: createHttpClientMock(),
    });

    await expect(client.getHealth()).rejects.toMatchObject({
      name: 'GatewayClientError',
      code: 'GATEWAY_BASE_URL_MISSING',
    });
  });

  it('sends bearer token header for gateway health check', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request.mockResolvedValue({
      data: {
        status: 'ok',
      },
    });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com/',
      adminToken: 'token-123',
      httpClient,
    });

    await client.getHealth();

    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/health',
        headers: {
          Authorization: 'Bearer token-123',
        },
      }),
    );
  });

  it('encodes session id for QR endpoint', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request.mockResolvedValue({
      data: {
        code: 'qr-content',
        expiresAt: '2026-02-09T10:00:00.000Z',
      },
    });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    await client.getWhatsAppPersonalQr('session/with/slash');

    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/whatsapp/personal/sessions/session%2Fwith%2Fslash/qr',
      }),
    );
  });

  it('maps axios-style errors to GatewayClientError', async () => {
    const httpClient = createHttpClientMock();
    const requestError = {
      isAxiosError: true,
      message: 'Request failed with status code 403',
      response: {
        status: 403,
        data: {
          detail: 'Personal mode disabled',
          code: 'PERSONAL_MODE_DISABLED',
        },
      },
    };

    httpClient.request.mockRejectedValue(requestError);

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    await expect(client.startWhatsAppPersonalSession('Home')).rejects.toEqual(
      expect.objectContaining({
        name: 'GatewayClientError',
        message: 'Personal mode disabled',
        statusCode: 403,
        code: 'PERSONAL_MODE_DISABLED',
        details: null,
      }),
    );
  });

  it('maps session id detail from gateway conflict payload', async () => {
    const httpClient = createHttpClientMock();
    const requestError = {
      isAxiosError: true,
      message: 'Request failed with status code 409',
      response: {
        status: 409,
        data: {
          detail: 'A personal session is already running (session-1).',
          code: 'SESSION_ALREADY_RUNNING',
          sessionId: 'session-1',
        },
      },
    };

    httpClient.request.mockRejectedValue(requestError);

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    await expect(client.startWhatsAppPersonalSession('Home')).rejects.toEqual(
      expect.objectContaining({
        name: 'GatewayClientError',
        statusCode: 409,
        code: 'SESSION_ALREADY_RUNNING',
        details: {
          sessionId: 'session-1',
        },
      }),
    );
  });

  it('uses token override when call options contain adminToken', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request.mockResolvedValue({
      data: {
        status: 'ok',
      },
    });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      adminToken: 'default-token',
      httpClient,
    });

    await client.getHealth({ adminToken: 'override-token' });

    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer override-token',
        },
      }),
    );
  });

  it('returns normalized response payloads for start/status/stop', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request
      .mockResolvedValueOnce({
        data: {
          sessionId: 'session-1',
          accountLabel: 'Home',
          status: 'PENDING_QR',
        },
      })
      .mockResolvedValueOnce({
        data: {
          sessionId: 'session-1',
          accountLabel: 'Home',
          status: 'ACTIVE',
        },
      })
      .mockResolvedValueOnce({
        data: {
          undefinedPayloadFor204: true,
        },
      });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    const started = await client.startWhatsAppPersonalSession('Home');
    const status = await client.getWhatsAppPersonalStatus('session-1');
    const stopped = await client.stopWhatsAppPersonalSession('session-1');

    expect(started.sessionId).toBe('session-1');
    expect(status.status).toBe('ACTIVE');
    expect(stopped.success).toBe(true);
  });

  it('requests capabilities and wecom account inventory endpoints', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request
      .mockResolvedValueOnce({
        data: {
          wechatModes: ['WECOM_APP_BRIDGE'],
          defaultWeChatMode: 'WECOM_APP_BRIDGE',
          wecomAppEnabled: true,
          wechatPersonalEnabled: false,
          discordEnabled: true,
          discordAccountId: 'discord-acct-1',
          telegramEnabled: true,
          telegramAccountId: 'telegram-acct-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              accountId: 'corp-main',
              label: 'Corporate Main',
              mode: 'APP',
            },
          ],
        },
      });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    const capabilities = await client.getCapabilities();
    const accounts = await client.getWeComAccounts();

    expect(capabilities.defaultWeChatMode).toBe('WECOM_APP_BRIDGE');
    expect(capabilities.discordEnabled).toBe(true);
    expect(capabilities.telegramEnabled).toBe(true);
    expect(accounts.items).toHaveLength(1);
    expect(httpClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/capabilities',
      }),
    );
    expect(httpClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/wecom/accounts',
      }),
    );
  });

  it('requests peer-candidates endpoint with query options', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request.mockResolvedValue({
      data: {
        sessionId: 'session-1',
        accountLabel: 'Home WhatsApp',
        status: 'ACTIVE',
        updatedAt: '2026-02-09T10:00:00.000Z',
        items: [],
      },
    });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    const result = await client.getWhatsAppPersonalPeerCandidates('session/1', {
      limit: 50,
      includeGroups: false,
    });

    expect(result.sessionId).toBe('session-1');
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/whatsapp/personal/sessions/session%2F1/peer-candidates?limit=50&includeGroups=false',
      }),
    );
  });

  it('requests Discord peer-candidates endpoint with query options', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request.mockResolvedValue({
      data: {
        accountId: 'discord-acct-1',
        updatedAt: '2026-02-10T10:00:00.000Z',
        items: [],
      },
    });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    const result = await client.getDiscordPeerCandidates({
      accountId: 'discord-acct-1',
      limit: 50,
      includeGroups: false,
    });

    expect(result.accountId).toBe('discord-acct-1');
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/discord/peer-candidates?limit=50&includeGroups=false&accountId=discord-acct-1',
      }),
    );
  });

  it('requests Telegram peer-candidates endpoint with query options', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request.mockResolvedValue({
      data: {
        accountId: 'telegram-acct-1',
        updatedAt: '2026-02-10T10:00:00.000Z',
        items: [],
      },
    });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    const result = await client.getTelegramPeerCandidates({
      accountId: 'telegram-acct-1',
      limit: 50,
      includeGroups: false,
    });

    expect(result.accountId).toBe('telegram-acct-1');
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/telegram/peer-candidates?limit=50&includeGroups=false&accountId=telegram-acct-1',
      }),
    );
  });

  it('requests WeChat personal session endpoints', async () => {
    const httpClient = createHttpClientMock();
    httpClient.request
      .mockResolvedValueOnce({
        data: {
          sessionId: 'wechat-session-1',
          accountLabel: 'Home WeChat',
          status: 'PENDING_QR',
        },
      })
      .mockResolvedValueOnce({
        data: {
          code: 'wechat-qr-content',
          expiresAt: '2026-02-09T10:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({
        data: {
          sessionId: 'wechat-session-1',
          accountLabel: 'Home WeChat',
          status: 'ACTIVE',
        },
      })
      .mockResolvedValueOnce({
        data: {
          sessionId: 'wechat-session-1',
          accountLabel: 'Home WeChat',
          status: 'ACTIVE',
          updatedAt: '2026-02-09T10:01:00.000Z',
          items: [],
        },
      })
      .mockResolvedValueOnce({
        data: {},
      });

    const client = new MessagingGatewayClient({
      baseUrl: 'https://gateway.example.com',
      httpClient,
    });

    await client.startWeChatPersonalSession('Home WeChat');
    await client.getWeChatPersonalQr('wechat/session/1');
    await client.getWeChatPersonalStatus('wechat/session/1');
    await client.getWeChatPersonalPeerCandidates('wechat/session/1', {
      limit: 25,
      includeGroups: true,
    });
    await client.stopWeChatPersonalSession('wechat/session/1');

    expect(httpClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'POST',
        url: 'https://gateway.example.com/api/channel-admin/v1/wechat/personal/sessions',
      }),
    );
    expect(httpClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/wechat/personal/sessions/wechat%2Fsession%2F1/qr',
      }),
    );
    expect(httpClient.request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: 'GET',
        url: 'https://gateway.example.com/api/channel-admin/v1/wechat/personal/sessions/wechat%2Fsession%2F1/peer-candidates?limit=25&includeGroups=true',
      }),
    );
    expect(httpClient.request).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        method: 'DELETE',
        url: 'https://gateway.example.com/api/channel-admin/v1/wechat/personal/sessions/wechat%2Fsession%2F1',
      }),
    );
  });

  it('GatewayClientError carries nullable status/code/details', () => {
    const error = new GatewayClientError('boom', null, null);

    expect(error.statusCode).toBeNull();
    expect(error.code).toBeNull();
    expect(error.details).toBeNull();
  });
});
