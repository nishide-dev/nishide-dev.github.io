import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Vitest runs without `globals: true`, so React Testing Library cannot find a
// global `afterEach` to register its own auto-cleanup with. Without this,
// rendered trees pile up in document.body and any two tests in a file that
// query the same accessible name fail with "Found multiple elements".
afterEach(cleanup)

// jsdom does not implement matchMedia, which ThemeProvider calls on mount to
// resolve the "system" theme. Individual tests override this to drive the
// preference; this default keeps every other test from throwing.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })
}

// Node 20+ ships its own `localStorage` global, which needs `--localstorage-file`
// to be usable and otherwise resolves to an object with no methods at all — and
// it shadows jsdom's. ThemeProvider wraps its storage access in try/catch, so
// the resulting TypeError was swallowed and theme persistence was never
// actually exercised by any test. Installing a real in-memory Storage also
// keeps runs deterministic across Node versions and leaves no state on disk.
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

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
})
