import { useRouter, useLocalSearchParams } from "expo-router"
import { FC, useEffect } from "react"
import { ViewStyle, Alert } from "react-native"
import { Screen, Text } from "@/components"
import { tailorMeasurementApi } from "./measurement-data"


/**
 * Kept only so the DeleteMeasurement route stays functional — deletion now
 * lives on the edit screen. With a measurementId param this confirms and
 * deletes then returns; without one it just bounces back.
 */
export const DeleteMeasurementScreen: FC = 
  function DeleteMeasurementScreen() {
    const router = useRouter()
    const { measurementId } = useLocalSearchParams<{ measurementId?: string }>()

    useEffect(() => {
      if (!measurementId) {
        router.back()
        return
      }
      Alert.alert("Delete Measurement", "Delete this measurement? This cannot be undone.", [
        { text: "Cancel", style: "cancel", onPress: () =>router.back() },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await tailorMeasurementApi.remove(measurementId)
            if (!result.success) {
              Alert.alert("Delete Failed", result.message ?? "Could not delete the measurement.")
            }router.back()
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
  }

const $root: ViewStyle = {
  flex: 1,
}
