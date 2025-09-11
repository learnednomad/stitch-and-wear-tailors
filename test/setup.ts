// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"
import mockFile from "./mockFile"

// libraries to mock
jest.doMock("react-native", () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock("expo-localization", () => ({
  ...jest.requireActual("expo-localization"),
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../app/i18n/i18n.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}))

// Mock expo-crypto
jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))),
  digestStringAsync: jest.fn(() => Promise.resolve("mocked-hash")),
  CryptoDigestAlgorithm: {
    SHA256: "SHA256",
    SHA512: "SHA512",
  },
  CryptoEncoding: {
    HEX: "hex",
    BASE64: "base64",
    BASE64URL: "base64url",
  },
}))

// Mock Appwrite
jest.mock("appwrite", () => ({
  Client: jest.fn().mockImplementation(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    setPlatform: jest.fn().mockReturnThis(),
  })),
  Account: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    createEmailPasswordSession: jest.fn(),
    get: jest.fn(),
    deleteSession: jest.fn(),
    getSession: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    createVerification: jest.fn(),
    updateVerification: jest.fn(),
    createRecovery: jest.fn(),
    updateRecovery: jest.fn(),
  })),
  Databases: jest.fn().mockImplementation(() => ({
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    listDocuments: jest.fn(),
  })),
  ID: {
    unique: jest.fn(() => "unique-id-123"),
  },
  Query: {
    equal: jest.fn(),
    notEqual: jest.fn(),
    greaterThan: jest.fn(),
    lessThan: jest.fn(),
    search: jest.fn(),
    orderDesc: jest.fn(),
    orderAsc: jest.fn(),
    limit: jest.fn(),
  },
}))

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
