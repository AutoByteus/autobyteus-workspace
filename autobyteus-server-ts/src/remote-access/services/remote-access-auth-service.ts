import type { RemoteAccessAuthContext, RemoteAccessAuthorizationResult } from "../domain/models.js";
import { isLoopbackPeerAddress } from "../../api/security/remote-access-local-trust.js";
import {
  getPairedDeviceService,
  type PairedDeviceService,
} from "./paired-device-service.js";
import {
  getRemoteAccessSettingsService,
  type RemoteAccessSettingsService,
} from "./remote-access-settings-service.js";

const rejection = (
  statusCode: number,
  code: RemoteAccessAuthorizationResult extends infer T
    ? T extends { ok: false; code: infer C } ? C : never
    : never,
  message: string,
): RemoteAccessAuthorizationResult => ({ ok: false, statusCode, code, message });

const readBearerCredential = (authorizationHeader: string | string[] | undefined): string | null => {
  const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!header) {
    return null;
  }
  const match = header.match(/^\s*Bearer\s+(.+)\s*$/i);
  return match?.[1]?.trim() || null;
};

export class RemoteAccessAuthService {
  constructor(
    private readonly settingsService: RemoteAccessSettingsService = getRemoteAccessSettingsService(),
    private readonly deviceService: PairedDeviceService = getPairedDeviceService(),
  ) {}

  authorizeLoopbackOrBearer(input: {
    peerAddress?: string;
    authorizationHeader?: string | string[];
  }): Promise<RemoteAccessAuthorizationResult> {
    if (isLoopbackPeerAddress(input.peerAddress)) {
      return Promise.resolve({
        ok: true,
        context: { mode: "loopback", isAuthenticated: true },
      });
    }
    return this.authorizeMobileCredential(readBearerCredential(input.authorizationHeader));
  }

  async authorizeMobileCredential(credential: string | null | undefined): Promise<RemoteAccessAuthorizationResult> {
    const normalizedCredential = String(credential ?? "").trim();
    if (!normalizedCredential) {
      return rejection(401, "REMOTE_ACCESS_AUTH_REQUIRED", "Remote Access credential is required.");
    }

    const device = await this.deviceService.findActiveDeviceByCredential(normalizedCredential);
    if (!device) {
      return rejection(401, "REMOTE_ACCESS_AUTH_INVALID", "Remote Access credential is invalid.");
    }
    if (device.revokedAt) {
      return rejection(403, "REMOTE_ACCESS_DEVICE_REVOKED", "This paired device has been revoked.");
    }

    const settings = await this.settingsService.getSettings();
    if (!settings.phoneAccessEnabled) {
      return rejection(403, "PHONE_ACCESS_DISABLED", "Phone Access is disabled on this desktop.");
    }

    await this.deviceService.markLastSeen(device.deviceId).catch(() => {
      // Last-seen is best-effort and must not reject otherwise valid requests.
    });

    const context: RemoteAccessAuthContext = {
      mode: "mobile",
      isAuthenticated: true,
      deviceId: device.deviceId,
      clientFacingBaseUrl: device.clientFacingBaseUrl,
    };
    return { ok: true, context };
  }
}

let singleton: RemoteAccessAuthService | null = null;

export const getRemoteAccessAuthService = (): RemoteAccessAuthService => {
  singleton ??= new RemoteAccessAuthService();
  return singleton;
};

export const resetRemoteAccessAuthServiceForTests = (): void => {
  singleton = null;
};
