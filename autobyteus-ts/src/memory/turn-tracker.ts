export class TurnTracker {
  private counter: number;

  constructor(start = 1) {
    if (start < 1) {
      throw new Error('start must be >= 1');
    }
    this.counter = start - 1;
  }

  nextTurnId(): string {
    this.counter += 1;
    return `turn_${String(this.counter).padStart(4, '0')}`;
  }
}
