import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach } from "vitest"

// React Testing Library auto-configures itself only when `beforeAll`/`afterAll`
// are globals, and vite.config.ts does not set `globals: true`. Two things are
// lost as a result, and both fail silently rather than loudly:
//
//   1. auto-cleanup, so rendered trees accumulate across tests in a file;
//   2. the act environment, so React's "not wrapped in act(...)" warning never
//      fires and out-of-act state updates go unreported.
afterEach(cleanup)

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/**
 * A matchMedia stub that actually tracks its listeners, so any test file can
 * observe how a component reacts to the OS preference changing. A stub whose
 * `addEventListener` is a no-op silently drops the subscription and makes that
 * behaviour unobservable.
 */
function installMatchMedia() {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  let matches = false

  const media = (query: string): MediaQueryList =>
    ({
      get matches() {
        // A getter, not a snapshot: the provider holds this object across
        // changes and a frozen `matches` would misreport after the first flip.
        return matches
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => {
        listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: () => void) => {
        listeners.delete(listener)
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: media,
  })

  return {
    /** Flips the OS preference and notifies subscribers, event object included. */
    setPrefersDark(next: boolean) {
      matches = next
      for (const listener of listeners) {
        listener({ matches: next, media: "" } as MediaQueryListEvent)
      }
    },
    reset() {
      matches = false
      listeners.clear()
    },
  }
}

export const colorScheme = installMatchMedia()

// Node ships its own `localStorage` global, which needs `--localstorage-file`
// to be usable and otherwise resolves to an object with no methods at all — and
// it shadows jsdom's. ThemeProvider wraps storage access in try/catch, so the
// resulting TypeError was swallowed and theme persistence was never actually
// exercised by any test. An in-memory Storage also keeps runs deterministic
// across Node versions and leaves nothing on disk.
class MemoryStorage implements Storage {
  #entries = new Map<string, string>()

  get length(): number {
    return this.#entries.size
  }

  clear(): void {
    this.#entries.clear()
  }

  getItem(key: string): string | null {
    return this.#entries.get(String(key)) ?? null
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.#entries.delete(String(key))
  }

  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value))
  }
}

// No test may reach the network. A test that needs a response stubs `fetch`
// itself; everything else gets an immediate rejection, which is the same shape
// as an outage and is what the components already handle.
Object.defineProperty(window, "fetch", {
  configurable: true,
  writable: true,
  value: () => Promise.reject(new TypeError("fetch is not available in tests")),
})

function installLocalStorage() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    // Writable so a test can swap in a throwing stub and exercise the fallbacks
    // in ThemeProvider — the very paths this shim exists because nothing
    // reached.
    writable: true,
    value: new MemoryStorage(),
  })
}

installLocalStorage()

// Storage and the OS preference are global, so without this one test's choices
// leak into the next. Reinstalled rather than cleared, so a test that swapped
// in a throwing stub does not break the next file.
beforeEach(() => {
  installLocalStorage()
  colorScheme.reset()
  document.documentElement.className = ""
})
