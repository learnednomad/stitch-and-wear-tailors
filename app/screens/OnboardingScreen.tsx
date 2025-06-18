import { FC } from "react"
import { observer } from "mobx-react-lite" 
import { ViewStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text } from "@/components"
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "@/models" 

interface OnboardingScreenProps extends AppStackScreenProps<"Onboarding"> {}


export const OnboardingScreen: FC<OnboardingScreenProps> = observer(function OnboardingScreen() {
  
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()
  

  // Pull in navigation via hook
  // const navigation = useNavigation()
  return (
    <Screen style={$root} preset="scroll">
      <Text text="onboarding" />
    </Screen>
  )

})

const $root: ViewStyle = {
  flex: 1,
}
