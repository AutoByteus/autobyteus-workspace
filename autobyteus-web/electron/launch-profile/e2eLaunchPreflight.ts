import { assertBackendPortAvailable } from '../server/backendPortAvailability'
/** Isolation still rejects occupied endpoints before opening the isolated app. */
export async function assertEmbeddedServerListenerPortAvailable(port: number): Promise<void> {
  await assertBackendPortAvailable(port)
}
