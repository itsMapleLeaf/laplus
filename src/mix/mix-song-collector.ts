import { makeAutoObservable } from "mobx"
import type { RelatedResult, YoutubeVideo } from "../youtube.js"
import { findRelated, isLiveVideo, isPlaylist } from "../youtube.js"
import type { Mix } from "./mix.js"

const maxDurationSeconds = 60 * 15

export class MixSongCollector {
  ignoredLiveCount = 0
  ignoredPlaylistCount = 0
  ignoredLengthyCount = 0

  constructor() {
    makeAutoObservable(this)
  }

  async collectSongs(mix: Mix, video: YoutubeVideo) {
    mix.queue.reset()
    this.addSongsFromYoutubeResults(mix, [video, ...video.related])
    for await (const results of findRelated(video)) {
      this.addSongsFromYoutubeResults(mix, results)
    }
  }

  addSongsFromYoutubeResults(
    mix: Mix,
    results: Array<YoutubeVideo | RelatedResult>,
  ) {
    for (const result of results) {
      if (isLiveVideo(result)) {
        this.ignoredLiveCount += 1
        continue
      }

      if (isPlaylist(result)) {
        this.ignoredPlaylistCount += 1
        continue
      }

      const durationSeconds = result.duration ?? Infinity
      if (durationSeconds > maxDurationSeconds) {
        this.ignoredLengthyCount += 1
        continue
      }

      mix.queue.addSong({
        title: result.title,
        durationSeconds,
        thumbnailUrl: result.thumbnails.min,
        channelName: result.channel?.name,
        channelUrl: result.channel?.url,
        channelAvatarUrl: result.channel?.thumbnails?.min,
        youtubeId: result.id,
      })
    }
  }
}
