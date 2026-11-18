const TURN_ID_PATTERN = /^turn_(\d+)$/;

export class TurnTracker {
  private counter: number;

  constructor(start = 1) {
    if (start < 1) {
      throw new Error('start must be >= 1');
    }
    this.counter = start - 1;
  }

  /**
   * A tracker that continues a run's numbering after its stored turns (autobyteus-526): the next id is one past the
   * highest `turn_NNNN` among them; ids of another form (an explicit turn id) do not count. No stored turn: `turn_0001`.
   */
  static continuingAfter(storedTurnIds: Iterable<string>): TurnTracker {
    let highest = 0;
    for (const turnId of storedTurnIds) {
      const match = TURN_ID_PATTERN.exec(turnId);
      if (match) highest = Math.max(highest, Number(match[1]));
    }
    return new TurnTracker(highest + 1);
  }

  nextTurnId(): string {
    this.counter += 1;
    return `turn_${String(this.counter).padStart(4, '0')}`;
  }
}
