import type { AppUpdateOperation, AppUpdateState } from '../../shared/appUpdateTypes'
import { logger } from '../logger'
import { classifyAppUpdateError } from './appUpdateErrorClassifier'
import { buildErrorDedupeSignature, toIsoNow } from './appUpdateStateFormat'

/** Owns error classification, log deduplication and the corresponding updater state. */
export class AppUpdateErrorReporter {
  private lastSignature: string | null = null
  constructor(private readonly apply: (state: Partial<AppUpdateState>) => void) {}
  reset(): void { this.lastSignature = null }
  report(error: unknown, fallbackMessage: string, operation: AppUpdateOperation = 'updater-event'): void {
    const classification = classifyAppUpdateError(error, { operation, fallbackMessage })
    const signature = buildErrorDedupeSignature(classification.kind, classification.code, classification.diagnostic)
    if (signature === this.lastSignature) return
    this.lastSignature = signature
    logger.error(`[updater] ${fallbackMessage} (kind=${classification.kind}, operation=${classification.operation}, code=${classification.code ?? 'none'})\n${classification.diagnostic}`, error)
    this.apply({ status: 'error', message: classification.message, errorKind: classification.kind,
      errorOperation: classification.operation, ...(classification.operation.endsWith('-check') ? { checkedAt: toIsoNow() } : {}) })
  }
}
