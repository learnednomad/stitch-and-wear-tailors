import { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
import { tailorMeasurementApi } from "./measurement-data"

interface DeleteMeasurementScreenProps extends AppStackScreenProps<"DeleteMeasurement"> {}

/**
 * Kept only so the DeleteMeasurement route stays functional — deletion now
 * lives on the edit screen. With a measurementId param this confirms and
 * deletes then returns; without one it just bounces back.
 */
export const DeleteMeasurementScreen: FC<DeleteMeasurementScreenProps> = observer(
  function DeleteMeasurementScreen({ route }) {
    const navigation = useNavigation<any>()
    const measurementId = route.params?.measurementId

    useEffect(() => {
      if (!measurementId) {
        navigation.goBack()
        return
      }
      Alert.alert("Delete Measurement", "Delete this measurement? This cannot be undone.", [
        { text: "Cancel", style: "cancel", onPress: () => navigation.goBack() },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await tailorMeasurementApi.remove(measurementId)
            if (!result.success) {
              Alert.alert("Delete Failed", result.message ?? "Could not delete the measurement.")
            }
            navigation.goBack()
          },
        },
      ])
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <Screen style={$root} preset="fixed">
        <Text text="" />
      </Screen>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
}
