/**
 * OnboardingScreen
 *
 * Three-slide swipeable value-prop carousel shown before first sign-up.
 * Seen-state persists to storage under `onboarding.seen` so it only shows
 * once (AppNavigator checks the flag when picking the initial route).
 */
import { FC, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TextStyle,
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

export const OnboardingScreen: FC<OnboardingScreenProps> = observer(function OnboardingScreen({
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
    <Screen style={$root} preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={$content}>
      <TouchableOpacity style={$skip} onPress={finish}>
        <Text style={[$skipText, { color: theme.colors.textDim }]} text="Skip" />
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
          <View key={slide.title} style={[$slide, { width }]}>
            <Text style={$emoji} text={slide.emoji} />
            <Text preset="heading" text={slide.title} style={$slideTitle} />
            <Text style={[$slideBody, { color: theme.colors.textDim }]} text={slide.body} />
          </View>
        ))}
      </ScrollView>

      {/* page dots */}
      <View style={$dots}>
        {SLIDES.map((slide, index) => (
          <View
            key={slide.title}
            style={[
              $dot,
              {
                backgroundColor:
                  index === page ? theme.colors.tint : theme.colors.palette.neutral300,
              },
            ]}
          />
        ))}
      </View>

      <Button
        text={isLast ? "Get Started" : "Next"}
        onPress={handleNext}
        style={$nextButton}
      />
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  flex: 1,
}

const $skip: ViewStyle = {
  alignSelf: "flex-end",
  padding: spacing.md,
}

const $skipText: TextStyle = {
  fontSize: 15,
  fontWeight: "600",
}

const $carousel: ViewStyle = {
  flex: 1,
}

const $slide: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: spacing.xl,
}

const $emoji: TextStyle = {
  fontSize: 72,
  marginBottom: spacing.lg,
}

const $slideTitle: TextStyle = {
  textAlign: "center",
  marginBottom: spacing.sm,
}

const $slideBody: TextStyle = {
  textAlign: "center",
  lineHeight: 22,
}

const $dots: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing.xs,
  marginVertical: spacing.md,
}

const $dot: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
}

const $nextButton: ViewStyle = {
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
}
