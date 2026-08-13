import { Component, type ReactNode } from "react"

type Props = {
  children: ReactNode
  /** Named in the fallback so a reader knows what is missing, not just that
   * something is. */
  section: string
}

type State = { error: Error | null }

/**
 * Keeps one broken section from taking the page with it.
 *
 * React unmounts the whole tree when a render throws with nothing above it, so
 * a single malformed timeline date would blank the identity, the intro and the
 * links as well — and `main.tsx` mounts `<App/>` with no boundary. The timeline
 * is the one part of the page rendered from data that can throw
 * (`formatTimelineDate` rejects rather than coerces), so it gets one.
 *
 * `assertValidTimeline` runs over the real data in the tests and the deploy
 * workflow tests before it builds, so bad data should never reach production.
 * This is for `pnpm dev`, where the author would otherwise get a white screen
 * and no explanation.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.section}] render failed`, error)
  }

  render() {
    if (this.state.error) {
      return (
        <p className="text-body text-muted-foreground">
          {this.props.section} を表示できませんでした。
        </p>
      )
    }

    return this.props.children
  }
}
