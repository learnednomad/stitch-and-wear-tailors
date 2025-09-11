import { FC } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { Text } from "./Text"
import { useAppTheme } from "@/utils/useAppTheme"
import {
  calculatePasswordStrength,
  PasswordStrength,
  PasswordValidationRules,
} from "@/utils/passwordValidation"

interface PasswordStrengthIndicatorProps {
  /**
   * The password to evaluate
   */
  password: string
  /**
   * Custom validation rules (optional)
   */
  rules?: PasswordValidationRules
  /**
   * Show detailed criteria breakdown
   */
  showCriteria?: boolean
  /**
   * Show feedback messages
   */
  showFeedback?: boolean
  /**
   * Style override for container
   */
  style?: ViewStyle
  /**
   * Compact mode (smaller UI)
   */
  compact?: boolean
}

/**
 * Password strength indicator component with visual feedback
 * Shows strength bar, label, criteria, and improvement suggestions
 */
export const PasswordStrengthIndicator: FC<PasswordStrengthIndicatorProps> = ({
  password,
  rules,
  showCriteria = true,
  showFeedback = true,
  style: styleOverride,
  compact = false,
}) => {
  const { theme } = useAppTheme()
  const strength = calculatePasswordStrength(password, rules)

  if (!password) {
    return null
  }

  return (
    <View style={[$container, styleOverride]}>
      {/* Strength Bar */}
      <View style={$strengthBarContainer}>
        <View style={$strengthBarTrack}>
          {[0, 1, 2, 3, 4].map((level) => (
            <View
              key={level}
              style={[
                $strengthBarSegment,
                {
                  backgroundColor:
                    level <= strength.score ? strength.color : theme.colors.palette.neutral300,
                },
              ]}
            />
          ))}
        </View>
        <Text
          text={strength.label}
          style={[$strengthLabel, { color: strength.color }, compact && $strengthLabelCompact]}
        />
      </View>

      {/* Criteria Checklist */}
      {showCriteria && !compact && (
        <View style={$criteriaContainer}>
          <CriteriaItem
            label="Length"
            met={strength.criteria.length}
            description={`At least ${rules?.minLength || 8} characters`}
          />
          <CriteriaItem
            label="Uppercase"
            met={strength.criteria.uppercase}
            description="At least one uppercase letter"
          />
          <CriteriaItem
            label="Lowercase"
            met={strength.criteria.lowercase}
            description="At least one lowercase letter"
          />
          <CriteriaItem
            label="Numbers"
            met={strength.criteria.numbers}
            description="At least one number"
          />
          <CriteriaItem
            label="Special chars"
            met={strength.criteria.special}
            description="Special characters (!@#$%^&*)"
          />
        </View>
      )}

      {/* Feedback Messages */}
      {showFeedback && strength.feedback.length > 0 && (
        <View style={$feedbackContainer}>
          {strength.feedback.map((feedback, index) => (
            <Text
              key={index}
              text={`• ${feedback}`}
              style={[
                $feedbackText,
                {
                  color: strength.score >= 3 ? "#16a34a" : theme.colors.text,
                },
                compact && $feedbackTextCompact,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

interface CriteriaItemProps {
  label: string
  met: boolean
  description: string
}

const CriteriaItem: FC<CriteriaItemProps> = ({ label, met, description }) => {
  const { theme } = useAppTheme()

  return (
    <View style={$criteriaItem}>
      <View
        style={[
          $criteriaIcon,
          {
            backgroundColor: met ? "#16a34a" : theme.colors.palette.neutral400,
          },
        ]}
      >
        <Text
          text={met ? "✓" : ""}
          style={[
            $criteriaIconText,
            { color: met ? theme.colors.palette.neutral100 : "transparent" },
          ]}
        />
      </View>
      <View style={$criteriaContent}>
        <Text
          text={label}
          style={[$criteriaLabel, { color: met ? "#16a34a" : theme.colors.text }]}
        />
        <Text text={description} style={[$criteriaDescription, { color: theme.colors.textDim }]} />
      </View>
    </View>
  )
}

// Styles
const $container: ViewStyle = {
  marginTop: 8,
}

const $strengthBarContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
}

const $strengthBarTrack: ViewStyle = {
  flexDirection: "row",
  flex: 1,
  height: 8,
  borderRadius: 4,
  marginRight: 12,
  gap: 2,
}

const $strengthBarSegment: ViewStyle = {
  flex: 1,
  height: "100%",
  borderRadius: 2,
}

const $strengthLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  minWidth: 80,
  textAlign: "right",
}

const $strengthLabelCompact: TextStyle = {
  fontSize: 12,
  minWidth: 60,
}

const $criteriaContainer: ViewStyle = {
  marginBottom: 12,
}

const $criteriaItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
}

const $criteriaIcon: ViewStyle = {
  width: 20,
  height: 20,
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
}

const $criteriaIconText: TextStyle = {
  fontSize: 12,
  fontWeight: "bold",
}

const $criteriaContent: ViewStyle = {
  flex: 1,
}

const $criteriaLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  marginBottom: 2,
}

const $criteriaDescription: TextStyle = {
  fontSize: 12,
}

const $feedbackContainer: ViewStyle = {
  marginTop: 8,
}

const $feedbackText: TextStyle = {
  fontSize: 13,
  marginBottom: 4,
  lineHeight: 18,
}

const $feedbackTextCompact: TextStyle = {
  fontSize: 12,
  marginBottom: 2,
}
