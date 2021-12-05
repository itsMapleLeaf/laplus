import type { Client, Guild } from "discord.js"
import { autorun, makeAutoObservable } from "mobx"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { safeJsonParse } from "../helpers/json.js"
import type { LavalinkSocket } from "../lavalink.new/lavalink-socket.js"
import { Mix, serializedMixSchema } from "./mix.js"

const serializedMixesSchema = z.record(serializedMixSchema)
type SerializedMixes = z.infer<typeof serializedMixesSchema>

const dataFolderPath = process.env.DATA_FOLDER ?? "data"
const dataFilePath = join(dataFolderPath, "mixes.json")

export class MixManager {
  mixes = new Map<string, Mix>()

  constructor(readonly socket: LavalinkSocket) {
    makeAutoObservable(this, {
      getMix: false,
    })
  }

  getMix(guild: Guild) {
    return this.mixes.get(guild.id) ?? this.createMix(guild)
  }

  createMix(guild: Guild) {
    const mix = new Mix(guild, this.socket)
    this.mixes.set(guild.id, mix)
    return mix
  }

  async hydrateMixes(client: Client) {
    const dataString = await readFile(dataFilePath, "utf8").catch((error) => {
      console.error("Failed to read data file", error)
      return undefined
    })
    if (!dataString) return

    const result = serializedMixesSchema.safeParse(safeJsonParse(dataString))
    if (!result.success) {
      console.error("Failed to parse data file", result.error)
      return
    }

    for (const [guildId, data] of Object.entries(result.data)) {
      try {
        const guild =
          client.guilds.cache.get(guildId) ??
          (await client.guilds.fetch(guildId))
        await this.createMix(guild).hydrate(data)
      } catch (error) {
        console.error(`Failed to hydrate mix for guild ${guildId}`, error)
      }
    }
  }

  persistMixes() {
    autorun(async () => {
      try {
        const data: SerializedMixes = Object.fromEntries(
          [...this.mixes.entries()].map(([id, mix]) => [id, mix.serialized]),
        )
        await writeFile(dataFilePath, JSON.stringify(data))
      } catch (error) {
        console.error("Failed to save mixes", error)
      }
    })
  }
}
