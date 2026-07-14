/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import { ClientEnv } from "../../env"

export default {
  API_URL: "https://api.rss2json.com/v1/",
  PB_URL: ClientEnv.EXPO_PUBLIC_PB_URL || "https://api.stitchandwear.learnednomad.com",
  PASSWORD_RECOVERY_URL: "https://app.stitchandwear.learnednomad.com/reset-password",
}
