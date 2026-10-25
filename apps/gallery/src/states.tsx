import { CalendarSearch, Play, RotateCw } from "lucide-react"
import { useState } from "react"

import { AppBar } from "@/blocks/app-bar"
import { SectionHeader, type Status, StatusBadge } from "@/blocks/primitives"
import {
  CopyButton,
  EmptyState,
  ErrorState,
  LiveIndicator,
  Skeleton,
  UndoNotice,
} from "@/blocks/states"
import { Button } from "@/components/ui/button"
import type { LiveStatus } from "@/lib/live"

const statuses: Status[] = ["running", "done", "succeeded", "failed", "warning", "queued", "paused"]
const liveStatuses: LiveStatus[] = ["example", "connecting", "live", "offline"]

/** The undo notice after a release; releasing again restarts the countdown. */
function ReleaseExample() {
  const [round, setRound] = useState(0)
  const [released, setReleased] = useState(true)
  return released ? (
    <UndoNotice key={round} onUndo={() => setReleased(false)}>
      Released the 30 GiB volume held by job{" "}
      <span className="label-mono text-xs whitespace-nowrap">…866245</span>.
    </UndoNotice>
  ) : (
    <Button
      size="sm"
      variant="destructive"
      onClick={() => {
        setRound((n) => n + 1)
        setReleased(true)
      }}
    >
      Release volume
    </Button>
  )
}

/** The blocks an app shows before, without and instead of its content. */
export function StatesScreen() {
  return (
    <div className="min-h-svh">
      <AppBar product="Atelier" crumbs={["States"]} />

      <main className="mx-auto grid max-w-[1360px] grid-cols-12 gap-4 p-4 md:gap-5 md:p-6">
        <section className="panel col-span-12 space-y-5 p-5 lg:col-span-7">
          <SectionHeader
            title="Loading"
            meta={<span>skeletons shaped like what they replace</span>}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {["throughput", "gpu", "memory", "spend"].map((tile) => (
              <div key={tile} className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-52 w-full" />
        </section>

        <div className="col-span-12 flex flex-col gap-4 md:gap-5 lg:col-span-5">
          <section className="panel space-y-5 p-5">
            <SectionHeader title="Status" />
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Live source, from <code className="label-mono">useLiveState</code>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {liveStatuses.map((status) => (
                  <LiveIndicator key={status} status={status} />
                ))}
              </div>
            </div>
          </section>

          <section className="panel flex-1 space-y-4 p-5">
            <SectionHeader title="Errors" />
            <ErrorState
              title="Query timed out after 30 s"
              action={
                <Button size="sm" variant="outline">
                  <RotateCw /> Retry
                </Button>
              }
            >
              The warehouse was suspended while the query queued. Retry resumes it first.
            </ErrorState>
          </section>
        </div>

        <section className="panel col-span-12 flex md:col-span-6 lg:col-span-4">
          <EmptyState
            className="flex-1 justify-start"
            icon={<Play />}
            title="No runs yet"
            action={
              <Button size="sm">
                <Play /> Start a run
              </Button>
            }
          >
            Runs started from a notebook appear here as soon as their first cell starts.
          </EmptyState>
        </section>

        <section className="panel col-span-12 flex md:col-span-6 lg:col-span-4">
          <EmptyState
            className="flex-1 justify-start"
            icon={<CalendarSearch />}
            title="No rows for September"
            action={
              <Button size="sm" variant="outline">
                Change month
              </Button>
            }
          >
            The query ran and returned nothing for this month.
          </EmptyState>
        </section>

        <section className="panel col-span-12 space-y-4 p-5 lg:col-span-4">
          <SectionHeader title="Feedback" />
          <ReleaseExample />
          <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
            Copy confirms itself
            <CopyButton />
          </div>
        </section>
      </main>
    </div>
  )
}
