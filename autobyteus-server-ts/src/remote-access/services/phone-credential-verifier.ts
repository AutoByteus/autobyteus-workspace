import { EventEmitter } from "node:events";
import type {
  BearerCredentialVerifier,
  ClientRevocationListener,
  ClientRevocationSource,
  CredentialVerification,
} from "../../node-access/domain/credential-verification.js";
import { NODE_ACCESS_REFUSALS } from "../../node-access/domain/node-access-refusal.js";
import { REMOTE_ACCESS_MOBILE_CREDENTIAL_PREFIX } from "../domain/models.js";
import { getPairedDeviceService, type PairedDeviceService } from "./paired-device-service.js";
import { getRemoteAccessSettingsService, type RemoteAccessSettingsService } from "./remote-access-settings-service.js";

/**
 * The phone credential kind (`mra_`) for the node's request gate: a paired, unrevoked phone while Phone Access is on.
 * It publishes the phone revocations: a revoked device, and every phone when Phone Access is turned off.
 */
export class PhoneCredentialVerifier implements BearerCredentialVerifier, ClientRevocationSource {
  readonly prefix = REMOTE_ACCESS_MOBILE_CREDENTIAL_PREFIX;
  private readonly events = new EventEmitter();

  constructor(
    private readonly deviceService: PairedDeviceService = getPairedDeviceService(),
    private readonly settingsService: RemoteAccessSettingsService = getRemoteAccessSettingsService(),
  ) {
    deviceService.onClientRevoked((revocation) => this.events.emit("revoked", revocation));
    settingsService.onSettingsChanged((settings) => {
      if (!settings.phoneAccessEnabled) {
        this.events.emit("revoked", { kind: "phone", id: null, refusal: NODE_ACCESS_REFUSALS.phoneAccessDisabled });
      }
    });
  }

  async verify(credential: string): Promise<CredentialVerification> {
    const device = await this.deviceService.findDeviceByCredential(credential);
    if (!device) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    }
    if (device.revokedAt) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.deviceRevoked };
    }
    if (!(await this.settingsService.getSettings()).phoneAccessEnabled) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.phoneAccessDisabled };
    }
    this.deviceService.markLastSeen(device.deviceId);
    return { ok: true, identity: { kind: "phone", deviceId: device.deviceId } };
  }

  onClientRevoked(listener: ClientRevocationListener): () => void {
    this.events.on("revoked", listener);
    return () => this.events.off("revoked", listener);
  }
}
