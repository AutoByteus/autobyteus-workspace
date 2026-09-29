/** Process exit code per error category of the `isolated-app` command. */
export const EXIT_CODES = Object.freeze({
  ok: 0,
  usage: 2,
  environment: 3,
  notFound: 4,
  operation: 5,
})

/**
 * A lifecycle failure with a stable machine-readable `code` and an exit `category`.
 */
export class IsolatedAppError extends Error {
  constructor(code, message, { category = 'operation', details } = {}) {
    super(message)
    this.name = 'IsolatedAppError'
    this.code = code
    this.category = category
    this.details = details
  }
}

export const usageError = (code, message, details) =>
  new IsolatedAppError(code, message, { category: 'usage', details })
export const environmentError = (code, message, details) =>
  new IsolatedAppError(code, message, { category: 'environment', details })
export const notFoundError = (code, message, details) =>
  new IsolatedAppError(code, message, { category: 'notFound', details })
export const operationError = (code, message, details) =>
  new IsolatedAppError(code, message, { category: 'operation', details })
