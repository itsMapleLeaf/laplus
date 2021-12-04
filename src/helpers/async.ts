/* eslint-disable import/no-unused-modules */
export function debounce<Args extends unknown[]>(
  periodMs: number,
  fn: (...args: Args) => void,
) {
  let timeoutId: NodeJS.Timeout | undefined
  return (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(fn, periodMs, ...args)
  }
}

export function throttle<Args extends unknown[]>(
  periodMs: number,
  fn: (...args: Args) => void,
) {
  let timeoutId: NodeJS.Timeout | undefined
  let nextArgs: Args | undefined
  return (...args: Args) => {
    nextArgs = args
    timeoutId ??= setTimeout(() => {
      timeoutId = undefined
      fn(...nextArgs!)
    }, periodMs)
  }
}

export async function retryCount<Result>(
  count: number,
  fn: () => Result | Promise<Result>,
): Promise<Result> {
  let lastError: unknown
  for (let i = 0; i < count; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export async function firstResolved<
  Funcs extends [...Array<() => Promise<unknown>>],
>(funcs: Funcs): Promise<Awaited<ReturnType<Funcs[number]>>> {
  let firstError: unknown
  for (const func of funcs) {
    try {
      return (await func()) as Awaited<ReturnType<Funcs[number]>>
    } catch (error) {
      firstError ??= error
    }
  }
  throw firstError
}

export function createEffect<Args extends unknown[]>(
  fn: (...args: Args) => (() => void) | undefined | void,
) {
  let cleanup: (() => void) | undefined | void
  return function run(...args: Args) {
    cleanup?.()
    cleanup = fn(...args)
  }
}
