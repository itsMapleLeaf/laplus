export type PositiveInteger = number & { __isPositiveInteger: true }

export const isPositiveInteger = (value: number): value is PositiveInteger =>
  Number.isInteger(value) && value > 0
