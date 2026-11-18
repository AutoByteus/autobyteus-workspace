// An update that ends before it succeeds, with its code (C2/C1 refusal and failure codes, frozen) and
// how it ends: `refused` (the request cannot be met: nothing was changed) or `failed` (something went
// wrong while doing it; the old version runs).
export class UpdateError extends Error {
  constructor(code, message, outcome = 'refused') {
    super(message)
    this.code = code
    this.outcome = outcome
  }
}

export const refuse = (code, message) => new UpdateError(code, message, 'refused')
export const fail = (code, message) => new UpdateError(code, message, 'failed')
