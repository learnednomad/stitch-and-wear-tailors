/**
 * OnboardingScreen
 *
 * Three-slide swipeable value-prop carousel shown before first sign-up.
 * Seen-state persists to storage under `onboarding.seen` so it only shows
 * once (AppNavigator checks the flag when picking the initial route).
 */
import { FC, useRef, useState } from "react"
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native"
import { AppStackScreenProps } from "@/navigators"
import { Button, Screen, Text } from "@/components"
import { spacing } from "@/theme"
import { useAppTheme } from "@/utils/useAppTheme"
import * as storage from "@/utils/storage"

interface OnboardingScreenProps extends AppStackScreenProps<"Onboarding"> {}

export const ONBOARDING_SEEN_KEY = "onboarding.seen"

const SLIDES = [
  {
    emoji: "🧵",
    title: "Custom Tailoring",
    body: "Browse traditional and modern styles, pick your fabric and get garments made to your exact measurements.",
  },
  {
    emoji: "📦",
    title: "Track Progress",
    body: "Follow your order from cutting to finishing with live status updates from your tailor.",
  },
  {
    emoji: "💳",
    title: "Pay Securely",
    body: "See invoices, record payments and keep a clear history of deposits and balances.",
  },
]

export const OnboardingScreen: FC<OnboardingScreenProps> = function OnboardingScreen({
  navigation,
}) {
  const { theme } = useAppTheme()
  const { width } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const [page, setPage] = useState(0)

  const finish = () => {
    storage.saveString(ONBOARDING_SEEN_KEY, "true")
    navigation.navigate("SignUp")
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width))
  }

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true })
    } else {
      finish()
    }
  }

  const isLast = page === SLIDES.length - 1

  return (
    <Screen
      style={$root}
      preset="fixed"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={$content}
    >
      <TouchableOpacity className="self-end p-4" onPress={finish}>
        <Text
          className="text-[15px] font-semibold text-textDim dark:text-textDim-dark"
          text="Skip"
        />
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={$carousel}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} className="items-center justify-center px-8" style={{ width }}>
            <Text className="mb-6 text-[72px]" text={slide.emoji} />
            <Text preset="heading" text={slide.title} className="mb-3 text-center" />
            <Text
              className="text-center leading-[22px] text-textDim dark:text-textDim-dark"
              text={slide.body}
            />
          </View>
        ))}
      </ScrollView>

      {/* page dots */}
      <View className="my-4 flex-row justify-center gap-2">
        {SLIDES.map((slide, index) => (
          <View
            key={slide.title}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                index === page ? theme.colors.tint : theme.colors.palette.neutral300,
            }}
          />
        ))}
      </View>

      <Button text={isLast ? "Get Started" : "Next"} onPress={handleNext} style={$nextButton} />
    </Screen>
  )
}

// Screen style + contentContainerStyle props — stay inline style objects.
const $root: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  flex: 1,
}

// ScrollView style prop — stays inline.
const $carousel: ViewStyle = {
  flex: 1,
}

// Button style override — stays inline.
const $nextButton: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}
