import { Link, Stack } from "expo-router"
import { View } from "react-native"

import { Text } from "@/components"

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text text="This screen doesn't exist." preset="subheading" />
        <Link href="/" style={{ marginTop: 16 }}>
          <Text text="Go to home screen" />
        </Link>
      </View>
    </>
  )
}
