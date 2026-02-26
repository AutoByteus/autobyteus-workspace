import {
  ChannelIngressNotConfiguredError,
  type ChannelIngressRouteDependencies,
} from "./types.js";

export const createUnconfiguredDependencies =
  (): ChannelIngressRouteDependencies => ({
    ingressService: {
      handleInboundMessage: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel ingress service is not configured.",
        );
      },
    },
    deliveryEventService: {
      recordPending: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
      recordSent: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
      recordDelivered: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
      recordFailed: async () => {
        throw new ChannelIngressNotConfiguredError(
          "Channel delivery event service is not configured.",
        );
      },
    },
  });
