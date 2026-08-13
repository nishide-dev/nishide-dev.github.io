import { useEffect, useState } from "react"

import {
  type ContributionCalendar,
  fetchContributions,
} from "@/lib/github-activity"

export type ContributionState =
  | { status: "loading" }
  | { status: "ready"; calendar: ContributionCalendar }
  | { status: "error" }

/**
 * A third party going down is a normal outcome here, not an exception: the
 * state is three-valued and `error` is as ordinary as `ready`. The reason is
 * logged once, not thrown — a portfolio page has nothing useful to do with it.
 */
export function useContributions(login: string): ContributionState {
  const [state, setState] = useState<ContributionState>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: "loading" })

    fetchContributions(login, controller.signal).then(
      (calendar) => {
        // Aborting does not un-settle a promise whose response already
        // arrived, so without this a superseded request can overwrite the
        // current one — one account's graph under another's heading.
        if (controller.signal.aborted) return
        setState({ status: "ready", calendar })
      },
      // The rejection handler is passed to `then`, not chained as `catch`:
      // chained, it would also swallow anything the success handler throws and
      // report a local bug as "GitHub is unavailable".
      (error: unknown) => {
        if (controller.signal.aborted) return
        console.warn(`GitHub contributions unavailable for ${login}`, error)
        setState({ status: "error" })
      }
    )

    return () => controller.abort()
  }, [login])

  return state
}
