import { action, observable } from "mobx"
import { z } from "zod"
import type { PositiveInteger } from ".././helpers/is-positive-integer.js"
import type { RelatedResult, YoutubeVideo } from "../youtube.js"
import { findRelated, isLiveVideo, isPlaylist } from "../youtube.js"

const maxDurationSeconds = 60 * 15

type MixStatus = "idle" | "collectingSongs"

export type MixSong = z.infer<typeof mixSongSchema>
export const mixSongSchema = z.object({
  title: z.string(),
  durationSeconds: z.number(),
  thumbnailUrl: z.string().optional(),
  channelName: z.string().optional(),
  channelUrl: z.string().optional(),
  channelAvatarUrl: z.string().optional(),
  youtubeId: z.string(),
})

export function createMix() {
  const store = observable(
    {
      status: "idle" as MixStatus,
      songs: [] as MixSong[],
      // TODO: turn this into a single ignoredCounts object
      ignoredLiveCount: 0,
      ignoredPlaylistCount: 0,
      ignoredLengthyCount: 0,
    },
    {
      songs: observable.shallow,
    },
  )

  const addSongs = action(function addSongs(
    results: Array<YoutubeVideo | RelatedResult>,
  ) {
    for (const result of results) {
      if (isLiveVideo(result)) {
        store.ignoredLiveCount += 1
        continue
      }

      if (isPlaylist(result)) {
        store.ignoredPlaylistCount += 1
        continue
      }

      const durationSeconds = result.duration ?? Infinity
      if (durationSeconds > maxDurationSeconds) {
        store.ignoredLengthyCount += 1
        continue
      }

      store.songs.push({
        title: result.title,
        durationSeconds,
        thumbnailUrl: result.thumbnails.min,
        channelName: result.channel?.name,
        channelUrl: result.channel?.url,
        channelAvatarUrl: result.channel?.thumbnails?.min,
        youtubeId: result.id,
      })
    }
  })

  return {
    get store(): Readonly<typeof store> {
      return store
    },

    get isEmpty() {
      return store.songs.length === 0
    },

    get isCollectingSongs() {
      return store.status === "collectingSongs"
    },

    setSongs(songs: MixSong[]) {
      store.songs = songs
    },

    async collectSongs(video: YoutubeVideo) {
      if (store.status !== "idle") {
        throw new Error("Must be in idle state.")
      }

      try {
        store.songs = []
        store.ignoredLiveCount = 0
        store.ignoredPlaylistCount = 0
        store.ignoredLengthyCount = 0
        store.status = "collectingSongs"

        addSongs([video, ...video.related])
        for await (const videos of findRelated(video)) {
          addSongs(videos)
        }
      } finally {
        store.status = "idle"
      }
    },

    next(advanceCount = 1 as PositiveInteger) {
      store.songs.splice(0, advanceCount - 1)
      return store.songs.shift()
    },

    clear() {
      store.songs = []
    },

    remove(songs: MixSong[]) {
      store.songs = store.songs.filter((song) => !songs.includes(song))
    },
  }
}
