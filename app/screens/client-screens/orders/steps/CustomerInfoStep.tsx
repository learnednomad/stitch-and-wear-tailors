/**
 * Customer Information Step
 * First step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { ScrollView, View, ViewStyle, TextStyle, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button } from "@/components"
import { colors, spacing } from "@/theme"
import { useStores } from "@/models"
import { CustomerInfo, NigerianCity, SupportedLanguage } from "@/types/orders"

export const CustomerInfoStep: FC = observer(() => {
  const { orderStore, authStore } = useStores()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "lagos" as NigerianCity,
    preferredLanguage: "en" as SupportedLanguage,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Pre-fill with user data if available
    if (authStore.user) {
      setFormData((prev) => ({
        ...prev,
        firstName: authStore.user?.profile.firstName || "",
        lastName: authStore.user?.profile.lastName || "",
        email: authStore.user?.email || "",
        phone: authStore.user?.profile.phone ?? "",
      }))
    }

    // Load existing data if available
    if (orderStore.orderCreationData?.customerInfo) {
      const existing = orderStore.orderCreationData.customerInfo
      setFormData({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        phone: existing.phone,
        address: existing.address,
        city: existing.city as NigerianCity,
        preferredLanguage: existing.preferredLanguage as SupportedLanguage,
      })
    }
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = orderStore.getTranslation("errors", "required_field")
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = orderStore.getTranslation("errors", "required_field")
    }
    if (!formData.email.trim()) {
      newErrors.email = orderStore.getTranslation("errors", "required_field")
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!formData.phone.trim()) {
      newErrors.phone = orderStore.getTranslation("errors", "required_field")
    }
    if (!formData.address.trim()) {
      newErrors.address = orderStore.getTranslation("errors", "required_field")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      orderStore.setOrderCustomerInfo(formData as CustomerInfo)
      Alert.alert("Information Saved", "Customer information has been saved successfully.")
    }
  }

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const cities = [
    { value: "lagos" as NigerianCity, label: orderStore.getTranslation("cities", "lagos") },
    { value: "abuja" as NigerianCity, label: orderStore.getTranslation("cities", "abuja") },
    { value: "kano" as NigerianCity, label: orderStore.getTranslation("cities", "kano") },
  ]

  const languages = [
    { value: "en" as SupportedLanguage, label: "English" },
    { value: "yo" as SupportedLanguage, label: "Yorùbá" },
    { value: "ha" as SupportedLanguage, label: "Hausa" },
    { value: "ig" as SupportedLanguage, label: "Igbo" },
  ]

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-lg">
        <Text className="mb-xs text-[24px] font-bold" style={$titleColor}>
          {orderStore.getTranslation("customerInfo", "en")}
        </Text>
        <Text className="mb-lg text-[14px] leading-[20px]" style={$subtitleColor}>
          Please provide your contact information for this order
        </Text>

        {/* Name Fields */}
        <View className="flex-row gap-md">
          <View className="flex-1">
            <TextField
              label="First Name"
              placeholder="Enter first name"
              value={formData.firstName}
              onChangeText={(text) => handleFieldChange("firstName", text)}
              status={errors.firstName ? "error" : undefined}
              helper={errors.firstName}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Last Name"
              placeholder="Enter last name"
              value={formData.lastName}
              onChangeText={(text) => handleFieldChange("lastName", text)}
              status={errors.lastName ? "error" : undefined}
              helper={errors.lastName}
            />
          </View>
        </View>

        {/* Contact Fields */}
        <TextField
          label="Email Address"
          placeholder="your.email@example.com"
          value={formData.email}
          onChangeText={(text) => handleFieldChange("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
          status={errors.email ? "error" : undefined}
          helper={errors.email}
        />

        <TextField
          label="Phone Number"
          placeholder="+234 XXX XXX XXXX"
          value={formData.phone}
          onChangeText={(text) => handleFieldChange("phone", text)}
          keyboardType="phone-pad"
          status={errors.phone ? "error" : undefined}
          helper={errors.phone}
        />

        <TextField
          label="Address"
          placeholder="Enter your delivery address"
          value={formData.address}
          onChangeText={(text) => handleFieldChange("address", text)}
          multiline
          numberOfLines={3}
          status={errors.address ? "error" : undefined}
          helper={errors.address}
        />

        {/* City Selection */}
        <View className="mt-lg">
          <Text className="mb-md text-[16px] font-semibold" style={$sectionTitleColor}>
            City
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {cities.map((city) => (
              <Button
                key={city.value}
                text={city.label}
                style={[$optionButton, formData.city === city.value && $selectedOption]}
                textStyle={[$optionText, formData.city === city.value && $selectedOptionText]}
                onPress={() => handleFieldChange("city", city.value)}
              />
            ))}
          </View>
        </View>

        {/* Language Selection */}
        <View className="mt-lg">
          <Text className="mb-md text-[16px] font-semibold" style={$sectionTitleColor}>
            Preferred Language
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {languages.map((lang) => (
              <Button
                key={lang.value}
                text={lang.label}
                style={[
                  $optionButton,
                  formData.preferredLanguage === lang.value && $selectedOption,
                ]}
                textStyle={[
                  $optionText,
                  formData.preferredLanguage === lang.value && $selectedOptionText,
                ]}
                onPress={() => {
                  handleFieldChange("preferredLanguage", lang.value)
                  orderStore.setLanguage(lang.value)
                }}
              />
            ))}
          </View>
        </View>

        {/* Save Button */}
        <Button
          text="Save Information"
          style={$saveButton}
          textStyle={$saveButtonText}
          onPress={handleSave}
        />

        <View className="h-xl" />
      </View>
    </ScrollView>
  )
})

// Styles
// This screen reads the STATIC (light-only) `colors` import, so text colors stay
// as inline styles (no `dark:` variants). Layout, spacing, and container
// backgrounds/borders are className token utilities. Button style/textStyle
// overrides stay inline (Button owns its className; callers never pass one in).
const $titleColor: TextStyle = { color: colors.palette.deepCharcoal }
const $subtitleColor: TextStyle = { color: colors.palette.threadBlue }
const $sectionTitleColor: TextStyle = { color: colors.palette.deepCharcoal }

const $optionButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $selectedOption: ViewStyle = {
  backgroundColor: colors.palette.tailorGold + "20",
  borderColor: colors.palette.tailorGold,
}

const $optionText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
  color: colors.palette.deepCharcoal,
}

const $selectedOptionText: TextStyle = {
  color: colors.palette.tailorGold,
  fontWeight: "600",
}

const $saveButton: ViewStyle = {
  backgroundColor: colors.palette.sageGreen,
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginTop: spacing.xl,
}

const $saveButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.warmIvory,
  textAlign: "center",
}
