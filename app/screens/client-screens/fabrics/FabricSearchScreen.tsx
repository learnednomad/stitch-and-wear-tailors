import { FC } from "react"
import { observer } from "mobx-react-lite" 
import { ViewStyle, View, TouchableOpacity, TextStyle } from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Screen, Text, Icon } from "@/components"
import { useNavigation } from "@react-navigation/native"
import { colors, spacing } from "@/theme"
// import { useStores } from "@/models" 

interface FabricSearchScreenProps extends AppStackScreenProps<"FabricSearch"> {}


export const FabricSearchScreen: FC<FabricSearchScreenProps> = observer(function FabricSearchScreen() {
  
  // Pull in one of our MST stores
  // const { someStore, anotherStore } = useStores()
  

  // Pull in navigation via hook
  const navigation = useNavigation()
  return (
    <Screen style={$root} preset="scroll">
      {/* Header with Back Button */}
      <View style={$header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={$backButton}>
          <Icon icon="back" size={24} color={colors.palette.neutral900} />
        </TouchableOpacity>
        <Text style={$headerTitle}>Fabric Search</Text>
        <View style={$headerSpacer} />
      </View>
      
      <View style={$content}>
        <Text style={$placeholderText}>Fabric search functionality coming soon...</Text>
      </View>
    </Screen>
  )

})

const $root: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  flex: 1,
  fontSize: 18,
  fontWeight: "600",
  color: colors.palette.neutral900,
  textAlign: "center",
}

const $headerSpacer: ViewStyle = {
  width: 40,
}

const $content: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
}

const $placeholderText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
  textAlign: "center",
}
