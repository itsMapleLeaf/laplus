/* eslint-disable import/no-unused-modules */
export type EmitterListener<T> = (value: T) => void

export type Emitter<T> = {
  listen: (listener: EmitterListener<T>) => EmitterUnsubscribe
  emit: (value: T) => void
}

export type EmitterUnsubscribe = () => void

export function createEmitter<T = void>(): Emitter<T> {
  const listeners = new Set<EmitterListener<T>>()

  return {
    listen(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit(value) {
      for (const fn of listeners) fn(value)
    },
  }
}
