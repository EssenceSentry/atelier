import { useEffect, useState } from "react"

export type LiveStatus = "example" | "connecting" | "live" | "offline"

/**
 * State pushed by a service as server-sent events on `/events`, sending the
 * current state on connect and each new one after it. That is the shape
 * lathe's service projects serve. Without a base URL the example state is
 * returned, so the page still renders offline and as an artifact.
 */
export function useLiveState<T>(
  baseUrl: string | undefined,
  example: T
): { state: T; status: LiveStatus } {
  const [state, setState] = useState<T>(example)
  const [status, setStatus] = useState<LiveStatus>(baseUrl ? "connecting" : "example")

  useEffect(() => {
    if (!baseUrl) return
    const events = new EventSource(`${baseUrl.replace(/\/$/, "")}/events`)
    events.onopen = () => setStatus("live")
    // EventSource reconnects by itself; the status shows the gap meanwhile.
    events.onerror = () => setStatus("offline")
    events.onmessage = (message: MessageEvent<string>) => {
      try {
        // The service owns the shape of its state.
        setState(JSON.parse(message.data) as T)
        setStatus("live")
      } catch {
        setStatus("offline")
      }
    }
    return () => events.close()
  }, [baseUrl])

  return { state, status }
}
