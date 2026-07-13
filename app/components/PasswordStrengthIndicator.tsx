import { FC } from "react"
import { View, ViewStyle } from "react-native"
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
 *
 * NativeWind: layout/spacing are className token utilities; every color is
 * data-driven (strength.color, met state, theme palette) so it stays inline.
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
  const strength: PasswordStrength = calculatePasswordStrength(password, rules)

  if (!password) {
    return null
  }

  return (
    <View className="mt-2" style={styleOverride}>
      {/* Strength Bar */}
      <View className="mb-sm flex-row items-center justify-between">
        <View className="mr-sm h-2 flex-1 flex-row gap-[2px] rounded">
          {[0, 1, 2, 3, 4].map((level) => (
            <View
              key={level}
              className="h-full flex-1 rounded-sm"
              style={{
                backgroundColor:
                  level <= strength.score ? strength.color : theme.colors.palette.neutral300,
              }}
            />
          ))}
        </View>
        <Text
          text={strength.label}
          className={`min-w-[80px] text-right text-[14px] font-semibold ${
            compact ? "min-w-[60px] text-[12px]" : ""
          }`}
          style={{ color: strength.color }}
        />
      </View>

      {/* Criteria Checklist */}
      {showCriteria && !compact && (
        <View className="mb-sm">
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
        <View className="mt-2">
          {strength.feedback.map((feedback, index) => (
            <Text
              key={index}
              text={`• ${feedback}`}
              className={`mb-1 text-[13px] leading-[18px] ${compact ? "mb-[2px] text-[12px]" : ""}`}
              style={{ color: strength.score >= 3 ? "#16a34a" : theme.colors.text }}
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
    <View className="mb-2 flex-row items-center">
      <View
        className="mr-sm h-5 w-5 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: met ? "#16a34a" : theme.colors.palette.neutral400 }}
      >
        <Text
          text={met ? "✓" : ""}
          className="text-[12px] font-bold"
          style={{ color: met ? theme.colors.palette.neutral100 : "transparent" }}
        />
      </View>
      <View className="flex-1">
        <Text
          text={label}
          className="mb-[2px] text-[14px] font-medium"
          style={{ color: met ? "#16a34a" : theme.colors.text }}
        />
        <Text text={description} className="text-[12px]" style={{ color: theme.colors.textDim }} />
      </View>
    </View>
  )
}
