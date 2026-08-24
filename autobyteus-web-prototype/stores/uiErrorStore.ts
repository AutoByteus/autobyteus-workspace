import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

export type UiErrorSource =
  | 'vue'
  | 'nuxt'
  | 'window'
  | 'unhandledrejection'
  | 'console.error'
  | 'apollo'
  | 'custom'

export interface UiErrorEntry {
  id: string
  message: string
  stack?: string
  detail?: string
  source?: UiErrorSource
  time: string
  count: number
}

const MAX_ENTRIES = 50
const DUPLICATE_WINDOW_MS = 1500

function safeStringify(value: unknown, maxLength = 4000): string | undefined {
  if (value === null || value === undefined) return undefined
  try {
    const seen = new WeakSet()
    const json = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]'
          seen.add(val)
        }
        return val
      },
      2
    )
    if (!json) return undefined
    return json.length > maxLength ? `${json.slice(0, maxLength)}...` : json
  } catch (e) {
    return String(value)
  }
}

function normalizeError(error: unknown): { message: string; stack?: string; detail?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
      detail: safeStringify(error)
    }
  }
  if (typeof error === 'string') {
    return { message: error }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? 'Unknown error')
    return {
      message,
      detail: safeStringify(error)
    }
  }
  return {
    message: 'Unknown error',
    detail: safeStringify(error)
  }
}

export const useUiErrorStore = defineStore('uiError', {
  state: () => ({
    errors: [] as UiErrorEntry[],
    isOpen: false,
  }),

  actions: {
    push(error: unknown, source: UiErrorSource = 'custom') {
      const normalized = normalizeError(error)
      const now = new Date()
      this.isOpen = true

      const last = this.errors[0]
      if (
        last &&
        last.message === normalized.message &&
        last.source === source &&
        Math.abs(now.getTime() - new Date(last.time).getTime()) < DUPLICATE_WINDOW_MS
      ) {
        last.count += 1
        last.time = now.toISOString()
        if (!last.stack && normalized.stack) last.stack = normalized.stack
        if (!last.detail && normalized.detail) last.detail = normalized.detail
        return
      }

      const entry: UiErrorEntry = {
        id: uuidv4(),
        message: normalized.message,
        stack: normalized.stack,
        detail: normalized.detail,
        source,
        time: now.toISOString(),
        count: 1
      }

      this.errors.unshift(entry)
      if (this.errors.length > MAX_ENTRIES) {
        this.errors.length = MAX_ENTRIES
      }
    },

    remove(id: string) {
      this.errors = this.errors.filter(err => err.id !== id)
    },

    clear() {
      this.errors = []
    },

    toggle() {
      this.isOpen = !this.isOpen
    },

    open() {
      this.isOpen = true
    },

    close() {
      this.isOpen = false
    }
  }
})
