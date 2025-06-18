import { FC } from "react"
import { observer } from "mobx-react-lite" 
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "@/models" 

interface DeleteMeasurmentScreenProps extends AppStackScreenProps<"DeleteMeasurment"> {}


export const DeleteMeasurmentScreen: FC<DeleteMeasurmentScreenProps> = observer(function DeleteMeasurmentScreen() {
  
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()
  

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={$root} preset="scroll">
      <Text text="deleteMeasurment" />
    </Screen>
  )

})

const $root: ViewStyle = {
  flex: 1,
}
