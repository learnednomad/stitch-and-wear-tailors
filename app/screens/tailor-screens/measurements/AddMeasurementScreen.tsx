import { FC } from "react"
import { MeasurementForm } from "./MeasurementForm"


/**
 * Create a new measurement template owned by the tailor.
 */
export const AddMeasurementScreen: FC = 
  function AddMeasurementScreen() {
    return <MeasurementForm mode="add" />
  }
