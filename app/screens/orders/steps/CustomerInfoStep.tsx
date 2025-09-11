import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle } from "react-native"
import { TextField, Text, Toggle } from "../../../components"
import { useStores } from "../../../models"
import { colors, spacing, typography } from "../../../theme"
import { Picker } from "@react-native-picker/picker"

const CONTAINER: ViewStyle = {
  flex: 1,
}

const FORM_GROUP: ViewStyle = {
  marginBottom: spacing.medium,
}

const LABEL: TextStyle = {
  fontFamily: typography.primary.medium,
  fontSize: 14,
  color: colors.text,
  marginBottom: spacing.tiny,
}

const PICKER_CONTAINER: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.separator,
  marginBottom: spacing.small,
}

const ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
}

const HALF_WIDTH: ViewStyle = {
  flex: 0.48,
}

export const CustomerInfoStep: FC = observer(function CustomerInfoStep() {
  const { orderStore } = useStores()

  const [firstName, setFirstName] = useState(
    orderStore.orderCreationData?.customerInfo?.firstName || "",
  )
  const [lastName, setLastName] = useState(
    orderStore.orderCreationData?.customerInfo?.lastName || "",
  )
  const [email, setEmail] = useState(orderStore.orderCreationData?.customerInfo?.email || "")
  const [phone, setPhone] = useState(orderStore.orderCreationData?.customerInfo?.phone || "")
  const [address, setAddress] = useState(orderStore.orderCreationData?.customerInfo?.address || "")
  const [city, setCity] = useState(orderStore.orderCreationData?.customerInfo?.city || "lagos")
  const [language, setLanguage] = useState(
    orderStore.orderCreationData?.customerInfo?.preferredLanguage || "en",
  )
  const [isNewCustomer, setIsNewCustomer] = useState(true)

  const handleSave = () => {
    orderStore.setOrderCustomerInfo({
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      preferredLanguage: language,
    })
  }

  // Auto-save on blur
  const handleBlur = () => {
    handleSave()
  }

  return (
    <View style={CONTAINER}>
      <View style={FORM_GROUP}>
        <Toggle
          label="New Customer"
          value={isNewCustomer}
          onPress={() => setIsNewCustomer(!isNewCustomer)}
        />
      </View>

      <View style={ROW}>
        <View style={HALF_WIDTH}>
          <TextField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            onBlur={handleBlur}
            placeholder="John"
            autoCapitalize="words"
          />
        </View>
        <View style={HALF_WIDTH}>
          <TextField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            onBlur={handleBlur}
            placeholder="Doe"
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={FORM_GROUP}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={handleBlur}
          placeholder="john.doe@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={FORM_GROUP}>
        <TextField
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          onBlur={handleBlur}
          placeholder="+234 803 123 4567"
          keyboardType="phone-pad"
        />
      </View>

      <View style={FORM_GROUP}>
        <TextField
          label="Address"
          value={address}
          onChangeText={setAddress}
          onBlur={handleBlur}
          placeholder="123 Main Street, Victoria Island"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={FORM_GROUP}>
        <Text style={LABEL}>City</Text>
        <View style={PICKER_CONTAINER}>
          <Picker
            selectedValue={city}
            onValueChange={(value) => {
              setCity(value)
              handleSave()
            }}
          >
            <Picker.Item label="Lagos" value="lagos" />
            <Picker.Item label="Abuja" value="abuja" />
            <Picker.Item label="Kano" value="kano" />
          </Picker>
        </View>
      </View>

      <View style={FORM_GROUP}>
        <Text style={LABEL}>Preferred Language</Text>
        <View style={PICKER_CONTAINER}>
          <Picker
            selectedValue={language}
            onValueChange={(value) => {
              setLanguage(value)
              handleSave()
            }}
          >
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Yoruba" value="yo" />
            <Picker.Item label="Hausa" value="ha" />
            <Picker.Item label="Igbo" value="ig" />
          </Picker>
        </View>
      </View>
    </View>
  )
})
