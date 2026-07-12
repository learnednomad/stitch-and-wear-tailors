/**
 * Bridges the PocketBase service layer's ServiceResult<T> to React Query.
 *
 * The service layer never throws — it returns a discriminated union.
 * React Query owns error state via thrown errors, so hooks wrap every
 * service call in `unwrap`, which throws a ServiceError on failure.
 */
import { GeneralApiProblem } from "@/services/api/apiProblem"
import { ServiceResult } from "@/services/api/base-api-service"

export class ServiceError extends Error {
  readonly problem?: GeneralApiProblem

  constructor(message: string, problem?: GeneralApiProblem) {
    super(message)
    this.name = "ServiceError"
    this.problem = problem
  }
}

export async function unwrap<T>(promise: Promise<ServiceResult<T>>): Promise<T> {
  const result = await promise
  if (!result.success) {
    throw new ServiceError(result.message ?? "Request failed", result.problem)
  }
  return result.data
}

/** Human-readable message from any thrown query/mutation error. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
