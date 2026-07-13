import { FC } from "react"
import { AppStackScreenProps } from "@/navigators"
import { MeasurementForm } from "./MeasurementForm"

interface AddMeasurementScreenProps extends AppStackScreenProps<"AddMeasurement"> {}

/**
 * Create a new measurement template owned by the tailor.
 */
export const AddMeasurementScreen: FC<AddMeasurementScreenProps> = 
  function AddMeasurementScreen() {
    return <MeasurementForm mode="add" />
  }
