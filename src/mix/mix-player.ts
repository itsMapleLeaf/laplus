import { TrackEndReason } from "@lavaclient/types"
import chalk from "chalk"
import type { Client } from "discord.js"
import { Util } from "discord.js"
import { observable } from "mobx"
import type { PositiveInteger } from ".././helpers/is-positive-integer.js"
import { loadLavalinkTrack } from "../lavalink/lavalink-http"
import { createLavalinkPlayer } from "../lavalink/lavalink-socket.js"
import { textChannelPresence } from "../singletons.js"
import type { MixSong } from "./mix-song.js"
import { createMix } from "./mix.js"

export type MixPlayer = ReturnType<typeof createMixPlayer>

export function createMixPlayer(client: Client, guildId: string) {
  const mix = createMix()

  const currentSong = observable.box<MixSong | undefined>(undefined, {
    deep: false,
  })

  const player = createLavalinkPlayer(client, guildId, (event) => {
    const song = currentSong.get()

    if (event.type === "TrackStuckEvent") {
      if (song) {
        textChannelPresence.reportError(
          `Track ${Util.escapeMarkdown(song.title)} got stuck.`,
        )
      }
      playNext().catch(textChannelPresence.reportError)
      return
    }

    if (event.type === "TrackExceptionEvent") {
      if (song) {
        textChannelPresence.reportError(
          `Error on ${Util.escapeMarkdown(song.title)}`,
        )
      }
      playNext().catch(textChannelPresence.reportError)
      return
    }

    if (
      event.type === "TrackEndEvent" &&
      event.reason === TrackEndReason.Finished
    ) {
      playNext().catch(textChannelPresence.reportError)
      return
    }
  })

  async function playNext(advanceCount = 1 as PositiveInteger): Promise<void> {
    const song = mix.next(advanceCount)
    if (!song) return

    const track = await loadLavalinkTrack(song.youtubeId)
    if (!track) {
      textChannelPresence.reportError(
        `Failed to load track **${song.title}**, skipping.`,
      )
      return playNext()
    }

    player.play(track)
    currentSong.set(song)

    console.info("Now playing:", chalk.bold(song.title))
  }

  return {
    get guildId() {
      return guildId
    },

    get mix() {
      return mix
    },

    get songs() {
      return mix.store.songs
    },

    get currentSong(): Readonly<MixSong> | undefined {
      return currentSong.get()
    },

    get progressSeconds() {
      return player.progressSeconds
    },

    playNext,

    async joinVoiceChannel(channelId: string) {
      await player.connectToVoiceChannel(channelId)
    },

    get voiceChannelId() {
      return player.voiceChannelId
    },

    async skip(count = 1 as PositiveInteger) {
      player.stop()
      await playNext(count)
    },

    clear() {
      mix.clear()
      currentSong.set(undefined)
      player.stop()
    },

    pause() {
      player.pause()
    },

    resume() {
      player.resume()
    },

    seek(seconds: number) {
      player.seek(seconds)
    },
  }
}
