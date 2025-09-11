/**
 * Customer Information Step
 * First step in Nigerian order creation workflow
 */

import React, { FC, useState, useEffect } from "react"
import { View, ScrollView, ViewStyle, TextStyle, Alert } from "react-native"
import { observer } from "mobx-react-lite"
import { Text, TextField, Button } from "app/components"
import { colors, spacing } from "app/theme"
import { useStores } from "@/models"
import { NigerianCity, SupportedLanguage } from "@/types/orders"

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
        firstName: authStore.user?.firstName || "",
        lastName: authStore.user?.lastName || "",
        email: authStore.user?.email || "",
        phone: authStore.user?.phone || "",
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
        city: existing.city,
        preferredLanguage: existing.preferredLanguage,
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
      orderStore.setOrderCustomerInfo(formData)
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
    <ScrollView style={$container} showsVerticalScrollIndicator={false}>
      <View style={$content}>
        <Text style={$title}>{orderStore.getTranslation("customerInfo", "en")}</Text>
        <Text style={$subtitle}>Please provide your contact information for this order</Text>

        {/* Name Fields */}
        <View style={$row}>
          <View style={$halfField}>
            <TextField
              label="First Name"
              placeholder="Enter first name"
              value={formData.firstName}
              onChangeText={(text) => handleFieldChange("firstName", text)}
              status={errors.firstName ? "error" : undefined}
              helper={errors.firstName}
            />
          </View>
          <View style={$halfField}>
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
        <View style={$section}>
          <Text style={$sectionTitle}>City</Text>
          <View style={$optionGrid}>
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
        <View style={$section}>
          <Text style={$sectionTitle}>Preferred Language</Text>
          <View style={$optionGrid}>
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

        <View style={$spacer} />
      </View>
    </ScrollView>
  )
})

// Styles
const $container: ViewStyle = {
  flex: 1,
}

const $content: ViewStyle = {
  padding: spacing.lg,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "700",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.xs,
}

const $subtitle: TextStyle = {
  fontSize: 14,
  color: colors.palette.threadBlue,
  marginBottom: spacing.lg,
  lineHeight: 20,
}

const $row: ViewStyle = {
  flexDirection: "row",
  gap: spacing.md,
}

const $halfField: ViewStyle = {
  flex: 1,
}

const $section: ViewStyle = {
  marginTop: spacing.lg,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.deepCharcoal,
  marginBottom: spacing.md,
}

const $optionGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
}

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

const $spacer: ViewStyle = {
  height: spacing.xl,
}
