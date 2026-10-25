import { Play, RotateCw, SearchX } from "lucide-react"

import { AppBar } from "@/blocks/app-bar"
import { SectionHeader, type Status, StatusBadge } from "@/blocks/primitives"
import { EmptyState, ErrorState, LiveIndicator, Skeleton } from "@/blocks/states"
import { Button } from "@/components/ui/button"
import type { LiveStatus } from "@/lib/live"

const statuses: Status[] = ["running", "done", "succeeded", "failed", "warning", "queued", "paused"]
const liveStatuses: LiveStatus[] = ["example", "connecting", "live", "offline"]

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
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
          <Skeleton className="h-52 w-full" />
        </section>

        <section className="panel col-span-12 space-y-6 p-5 lg:col-span-5">
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

        <section className="panel col-span-12 flex md:col-span-6 lg:col-span-4">
          <EmptyState
            className="flex-1"
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
            className="flex-1"
            icon={<SearchX />}
            title="No channels match “rail”"
            action={
              <Button size="sm" variant="outline">
                Clear search
              </Button>
            }
          >
            Search looks at channel names and handles. Try a shorter term.
          </EmptyState>
        </section>

        <section className="panel col-span-12 space-y-4 p-5 lg:col-span-4">
          <SectionHeader title="Errors" />
          <ErrorState
            title="Couldn’t reach the run service"
            action={
              <Button size="sm" variant="outline">
                <RotateCw /> Retry
              </Button>
            }
          >
            localhost:8790 refused the connection. Start the service, then retry.
          </ErrorState>
          <ErrorState title="Chart failed: no rows for September">
            The query returned nothing for this month. Check the date filter.
          </ErrorState>
        </section>
      </main>
    </div>
  )
}
