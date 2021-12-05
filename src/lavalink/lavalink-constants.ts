import { raise } from "../helpers/errors.js"

export const lavalinkPassword =
  process.env.LAVALINK_PASSWORD ?? raise("LAVALINK_PASSWORD not defined")

export const lavalinkSocketUrl =
  process.env.LAVALINK_SOCKET ?? raise("LAVALINK_SOCKET not defined")

export const lavalinkHttpUrl =
  process.env.LAVALINK_HTTP ?? raise("LAVALINK_HTTP not defined")
