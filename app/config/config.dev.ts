/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import { Platform } from "react-native"

// iOS simulator and web reach the host via 127.0.0.1; Android emulator via 10.0.2.2.
const defaultPBUrl =
  Platform.OS === "android" ? "http://10.0.2.2:8090" : "http://127.0.0.1:8090"

export default {
  API_URL: "https://api.rss2json.com/v1/",
  PB_URL: process.env.EXPO_PUBLIC_PB_URL || defaultPBUrl,
  PASSWORD_RECOVERY_URL: "http://localhost:8081/reset-password",
}
