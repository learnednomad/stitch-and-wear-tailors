import { FC } from "react"
import { observer } from "mobx-react-lite"
import { AppStackScreenProps } from "@/navigators"
import { MeasurementForm } from "./MeasurementForm"

interface EditMeasurementScreenProps extends AppStackScreenProps<"EditMeasurement"> {}

/**
 * View or edit a measurement profile. Customer-owned profiles render
 * read-only (mode "view" or non-owned records); the tailor's own templates
 * are editable and deletable from here.
 */
export const EditMeasurementScreen: FC<EditMeasurementScreenProps> = observer(
  function EditMeasurementScreen({ route }) {
    const { measurementId, mode } = route.params ?? {}
    return (
      <MeasurementForm mode={mode === "view" ? "view" : "edit"} measurementId={measurementId} />
    )
  },
)
