/**
 * Minimal ambient declaration for the `validator` package (no @types installed).
 * Only the methods actually used in this codebase are typed.
 */
declare module "validator" {
  const validator: {
    isEmail(str: string): boolean
  }
  export default validator
}
