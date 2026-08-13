import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Vitest runs without `globals: true`, so React Testing Library cannot find a
// global `afterEach` to register its own auto-cleanup with. Without this,
// rendered trees pile up in document.body and any two tests in a file that
// query the same accessible name fail with "Found multiple elements".
afterEach(cleanup)

// jsdom does not implement matchMedia, which ThemeProvider calls on mount to
// resolve the "system" theme.
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
