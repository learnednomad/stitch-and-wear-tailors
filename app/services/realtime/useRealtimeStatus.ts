/**
 * React hook exposing the RealtimeManager connection status so screens can
 * render a live/polling indicator.
 */

import { useEffect, useState } from "react"
import { realtimeManager, RealtimeStatus } from "./RealtimeManager"

export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>(realtimeManager.status)

  useEffect(() => {
    // onStatusChange invokes the listener immediately with the current value
    return realtimeManager.onStatusChange(setStatus)
  }, [])

  return status
}
