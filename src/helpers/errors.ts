export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export function raise(error: unknown): never {
  throw toError(error)
}

export function logErrorStack(error: unknown) {
  const { stack, message } = toError(error)
  console.error(stack || message)
}
