/**
 * Serializes one root's collaborator admissions. The root operation gates admit concurrent
 * operations (they only drain on termination), so `@` admissions and first messages to a
 * catalog address that arrive together are queued here: the second one sees the first one's
 * committed entry and reuses it instead of adding a second instance (REQ-004, REQ-010).
 * Operations run inside the caller's gate, so termination still drains them.
 */
export class CollaboratorAdmissionQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation, operation);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
