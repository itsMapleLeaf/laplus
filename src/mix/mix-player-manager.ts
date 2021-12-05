import type { Client } from "discord.js"
import { autorun, observable } from "mobx"
import type { MixPlayer } from "./mix-player.js"
import { createMixPlayer } from "./mix-player.js"
import { iterateSavedMixPlayers, saveMixPlayerState } from "./storage.js"

const players = observable.map<string, MixPlayer>({}, { deep: false })
let currentClient: Client | undefined

autorun(() => {
  for (const [, player] of players) {
    saveMixPlayerState(player)
  }
})

export async function restoreMixPlayers(client: Client) {
  currentClient = client

  for (const [guildId, state] of iterateSavedMixPlayers()) {
    try {
      const player = createMixPlayer(client, guildId)

      player.mix.setSongs(
        state.currentSong ? [state.currentSong, ...state.songs] : state.songs,
      )
      await player.playNext()
      player.seek(state.progressSeconds)

      if (state.voiceChannelId) {
        await player.joinVoiceChannel(state.voiceChannelId)
      }

      players.set(guildId, player)
    } catch (error) {
      console.error("Failed to restore player state:", error)
    }
  }
}

export function getMixPlayerForGuild(guildId: string): MixPlayer {
  let player = players.get(guildId)
  if (!player) {
    player = createMixPlayer(currentClient!, guildId)
    players.set(guildId, player)
  }
  return player
}
