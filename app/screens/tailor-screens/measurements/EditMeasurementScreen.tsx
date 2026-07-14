import { FC } from "react"
import { useLocalSearchParams } from "expo-router"
import { MeasurementForm } from "./MeasurementForm"


/**
 * View or edit a measurement profile. Customer-owned profiles render
 * read-only (mode "view" or non-owned records); the tailor's own templates
 * are editable and deletable from here.
 */
export const EditMeasurementScreen: FC =
  function EditMeasurementScreen() {
    const { id: measurementId, mode } = useLocalSearchParams<{
      id?: string
      mode?: "view" | "edit"
    }>()
    return (
      <MeasurementForm mode={mode === "view" ? "view" : "edit"} measurementId={measurementId} />
    )
  }
