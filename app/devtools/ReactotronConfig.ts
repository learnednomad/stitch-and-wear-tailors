/**
 * This file does the setup for integration with Reactotron, which is a
 * free desktop app for inspecting and debugging your React Native app.
 * @see https://github.com/infinitered/reactotron
 */
import { Platform, NativeModules } from "react-native"

import { ArgType } from "reactotron-core-client"
import { mst } from "reactotron-mst"
import mmkvPlugin from "reactotron-react-native-mmkv"

import { storage, clear } from "@/utils/storage"
import { goBack, resetRoot, navigate } from "@/navigators/navigationUtilities"

import { Reactotron } from "./ReactotronClient"
import { ReactotronReactNative } from "reactotron-react-native"
import { ReactotronApiUtils } from "./ReactotronApiPlugin"
import {
  ReactotronDevUtils,
  DevEnvironmentValidator,
  getReactotronHost,
  getReactotronPort,
} from "./ReactotronDevConfig"

// Validate development environment
DevEnvironmentValidator.logValidation()

// Setup development shortcuts
ReactotronDevUtils.setupDevShortcuts()

const reactotron = Reactotron.configure({
  name: ReactotronDevUtils.getConnectionConfig().name,
  host: getReactotronHost(),
  port: getReactotronPort(),
  onConnect: () => {
    /** since this file gets hot reloaded, let's clear the past logs every time we connect */
    Reactotron.clear()
    Reactotron.log("🔧 Reactotron connected! Enhanced API monitoring enabled.")
    ReactotronDevUtils.logEnvironmentInfo()
  },
})

reactotron.use(
  mst({
    /* ignore some chatty `mobx-state-tree` actions */
    filter: (event) => /postProcessSnapshot|@APPLY_SNAPSHOT/.test(event.name) === false,
  }),
)

reactotron.use(mmkvPlugin<ReactotronReactNative>({ storage }))

if (Platform.OS !== "web") {
  reactotron.useReactNative({
    networking: {
      ignoreUrls: /symbolicate/,
    },
  })
}

/**
 * Reactotron allows you to define custom commands that you can run
 * from Reactotron itself, and they will run in your app.
 *
 * Define them in the section below with `onCustomCommand`. Use your
 * creativity -- this is great for development to quickly and easily
 * get your app into the state you want.
 *
 * NOTE: If you edit this file while running the app, you will need to do a full refresh
 * or else your custom commands won't be registered correctly.
 */
reactotron.onCustomCommand({
  title: "Show Dev Menu",
  description: "Opens the React Native dev menu",
  command: "showDevMenu",
  handler: () => {
    Reactotron.log("Showing React Native dev menu")
    NativeModules.DevMenu.show()
  },
})

reactotron.onCustomCommand({
  title: "Reset Root Store",
  description: "Resets the MST store",
  command: "resetStore",
  handler: () => {
    Reactotron.log("resetting store")
    clear()
  },
})

reactotron.onCustomCommand({
  title: "Reset Navigation State",
  description: "Resets the navigation state",
  command: "resetNavigation",
  handler: () => {
    Reactotron.log("resetting navigation state")
    resetRoot({ index: 0, routes: [] })
  },
})

reactotron.onCustomCommand<[{ name: "route"; type: ArgType.String }]>({
  command: "navigateTo",
  handler: (args) => {
    const { route } = args ?? {}
    if (route) {
      Reactotron.log(`Navigating to: ${route}`)
      navigate(route as any) // this should be tied to the navigator, but since this is for debugging, we can navigate to illegal routes
    } else {
      Reactotron.log("Could not navigate. No route provided.")
    }
  },
  title: "Navigate To Screen",
  description: "Navigates to a screen by name.",
  args: [{ name: "route", type: ArgType.String }],
})

reactotron.onCustomCommand({
  title: "Go Back",
  description: "Goes back",
  command: "goBack",
  handler: () => {
    Reactotron.log("Going back")
    goBack()
  },
})

/**
 * Enhanced API monitoring commands for Issue #46 services layer
 */
reactotron.onCustomCommand({
  title: "Show API Statistics",
  description: "Display comprehensive API performance and usage statistics",
  command: "showApiStats",
  handler: () => {
    Reactotron.log("Displaying API service statistics...")
    ReactotronApiUtils.logServiceStats()
  },
})

reactotron.onCustomCommand({
  title: "Show API Request History",
  description: "Display recent API requests with success/failure status",
  command: "showApiHistory",
  handler: () => {
    Reactotron.log("Displaying API request history...")
    ReactotronApiUtils.showRequestHistory()
  },
})

reactotron.onCustomCommand({
  title: "Clear API Monitoring Data",
  description: "Clear all API analytics, cache stats, and request history",
  command: "clearApiData",
  handler: () => {
    Reactotron.log("Clearing all API monitoring data...")
    ReactotronApiUtils.clearAll()
  },
})

reactotron.onCustomCommand<[{ name: "endpoint"; type: ArgType.String }]>({
  title: "Test API Endpoint",
  description: "Make a test API call to any endpoint for debugging",
  command: "testEndpoint",
  args: [{ name: "endpoint", type: ArgType.String }],
  handler: async (args) => {
    const { endpoint } = args ?? {}
    if (endpoint) {
      Reactotron.log(`Testing API endpoint: ${endpoint}`)
      try {
        // Import API client dynamically to avoid circular imports
        const api = require("../services/api").api
        const response = await api.apisauce.get(endpoint)

        Reactotron.display({
          name: "🧪 API Test Result",
          preview: `${response.status} ${endpoint}`,
          value: {
            status: response.status,
            ok: response.ok,
            data: response.data,
            problem: response.problem,
            headers: response.headers,
          },
          important: true,
        })
      } catch (error) {
        Reactotron.error("API Test Failed", error)
      }
    } else {
      Reactotron.log("Could not test endpoint. No endpoint provided.")
    }
  },
})

/**
 * We're going to add `console.tron` to the Reactotron object.
 * Now, anywhere in our app in development, we can use Reactotron like so:
 *
 * ```
 * if (__DEV__) {
 *  console.tron.display({
 *    name: 'JOKE',
 *    preview: 'What's the best thing about Switzerland?',
 *    value: 'I don't know, but the flag is a big plus!',
 *    important: true
 *  })
 * }
 * ```
 *
 * Use this power responsibly! :)
 */
console.tron = reactotron

/**
 * We tell typescript about our dark magic
 *
 * You can also import Reactotron yourself from ./reactotronClient
 * and use it directly, like Reactotron.log('hello world')
 */
declare global {
  interface Console {
    /**
     * Reactotron client for logging, displaying, measuring performance, and more.
     * @see https://github.com/infinitered/reactotron
     * @example
     * if (__DEV__) {
     *  console.tron.display({
     *    name: 'JOKE',
     *    preview: 'What's the best thing about Switzerland?',
     *    value: 'I don't know, but the flag is a big plus!',
     *    important: true
     *  })
     * }
     */
    tron: typeof reactotron
  }
}

/**
 * Now that we've setup all our Reactotron configuration, let's connect!
 */
reactotron.connect()
