import { resolvePersistencePath } from "../../persistence/file/store-utils.js";
import { FileChannelIdempotencyProvider } from "./file-channel-idempotency-provider.js";

export class FileChannelCallbackIdempotencyProvider extends FileChannelIdempotencyProvider {
  constructor() {
    super(resolvePersistencePath("external-channel", "callback-idempotency.json"));
  }
}
