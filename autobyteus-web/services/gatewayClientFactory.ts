import { createMessagingGatewayClient } from '~/services/messagingGatewayClient';

export interface GatewayClientFactoryInput {
  baseUrl: string;
  adminToken?: string;
}

export function createGatewayClient(input: GatewayClientFactoryInput) {
  return createMessagingGatewayClient({
    baseUrl: input.baseUrl,
    adminToken: input.adminToken,
  });
}
