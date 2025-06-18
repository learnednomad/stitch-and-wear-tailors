import { FC } from "react"
import { observer } from "mobx-react-lite" 
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "@/models" 

interface VerifyOtpScreenProps extends AppStackScreenProps<"VerifyOtp"> {}


export const VerifyOtpScreen: FC<VerifyOtpScreenProps> = observer(function VerifyOtpScreen() {
  
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()
  

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={$root} preset="scroll">
      <Text text="verifyOtp" />
    </Screen>
  )

})

const $root: ViewStyle = {
  flex: 1,
}
