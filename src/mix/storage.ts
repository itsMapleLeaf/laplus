import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { safeJsonParse } from "../helpers/json.js"
import type { MixPlayer } from "./mix-player.js"
import { mixSongSchema } from "./mix-song.js"

type SavedMixPlayerState = z.infer<typeof savedMixPlayerStateSchema>
const savedMixPlayerStateSchema = z.object({
  currentSong: mixSongSchema.optional(),
  songs: z.array(mixSongSchema),
  progressSeconds: z.number(),
  voiceChannelId: z.string().optional(),
})

type SavedMixPlayerStore = z.infer<typeof savedMixPlayerStoreSchema>
const savedMixPlayerStoreSchema = z.object({
  playersByGuildId: z.record(savedMixPlayerStateSchema),
})

const dataFolder = process.env.DATA_FOLDER || "data"
console.info("Using data folder:", dataFolder)

const dataFilePath = join(dataFolder, "mix-player-state.json")

const store = await loadInitialData()

export function* iterateSavedMixPlayers(): Generator<
  [string, SavedMixPlayerState]
> {
  for (const [guildId, state] of Object.entries(store.playersByGuildId)) {
    yield [guildId, state]
  }
}

export function saveMixPlayerState(player: MixPlayer) {
  store.playersByGuildId[player.guildId] = {
    currentSong: player.currentSong,
    songs: player.mix.store.songs,
    progressSeconds: player.progressSeconds,
    voiceChannelId: player.voiceChannelId,
  }

  writeFile(dataFilePath, JSON.stringify(store)).catch((error) => {
    console.error("Failed to write data file", error)
  })
}

async function loadInitialData(): Promise<SavedMixPlayerStore> {
  const dataResult = await readFile(dataFilePath, "utf8")
    .then(safeJsonParse)
    .catch((error) => {
      console.error("Failed to read data file", error)
      return undefined
    })
    .then((content) => savedMixPlayerStoreSchema.safeParse(content))

  if (dataResult.success) {
    return dataResult.data
  } else {
    console.warn("Failed to parse data", dataResult.error.toString())
  }

  const newData: SavedMixPlayerStore = {
    playersByGuildId: {},
  }

  try {
    await mkdir(dataFolder, { recursive: true })
    await writeFile(dataFilePath, JSON.stringify(newData))
  } catch (error) {
    console.error("Failed to write initial data:", error)
  }

  return newData
}
