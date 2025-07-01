import { FC } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle } from "react-native"
import { TabScreenProps } from "@/navigators/ClientTabsNavigator"
import { Screen, Text } from "@/components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "@/models"

interface PaymentScreenProps extends TabScreenProps<"Pay"> {}

export const PaymentScreen: FC<PaymentScreenProps> = observer(function PaymentScreen() {
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={$root} preset="scroll">
      <Text text="payment" />
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}
