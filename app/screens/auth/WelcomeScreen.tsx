import { observer } from "mobx-react-lite"
import { FC } from "react"
import { Image, ImageStyle, View } from "react-native"
import { Text, Screen } from "@/components"
import { isRTL } from "@/i18n"
import { AppStackScreenProps } from "@/navigators"
import { $styles } from "@/theme"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"

const welcomeLogo = require("../../../assets/images/logo.png")
const welcomeFace = require("../../../assets/images/welcome-face.png")

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen() {
  const { theme } = useAppTheme()

  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  return (
    <Screen preset="fixed" contentContainerStyle={$styles.flex1}>
      <View className="shrink grow basis-[57%] justify-center px-lg">
        <Image className="mb-xxl h-[88px] w-full" source={welcomeLogo} resizeMode="contain" />
        <Text
          testID="welcome-heading"
          className="mb-md"
          tx="welcomeScreen:readyForLaunch"
          preset="heading"
        />
        <Text tx="welcomeScreen:exciting" preset="subheading" />
        <Image
          style={$welcomeFace}
          source={welcomeFace}
          resizeMode="contain"
          tintColor={theme.colors.palette.neutral900}
        />
      </View>

      <View
        className="shrink grow-0 basis-[43%] justify-around rounded-t-2xl bg-neutral100 px-lg dark:bg-neutral100-dark"
        style={$bottomContainerInsets}
      >
        <Text tx="welcomeScreen:postscript" size="md" />
      </View>
    </Screen>
  )
})

const $welcomeFace: ImageStyle = {
  height: 169,
  width: 269,
  position: "absolute",
  bottom: -47,
  right: -80,
  transform: [{ scaleX: isRTL ? -1 : 1 }],
}
