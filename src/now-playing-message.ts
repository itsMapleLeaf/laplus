import type { InteractionContext, ReplyHandle } from "@itsmapleleaf/gatekeeper"
import { embedComponent } from "@itsmapleleaf/gatekeeper"
import type { MessageEmbedOptions } from "discord.js"
import prettyMilliseconds from "pretty-ms"
import { defaultEmbedColor } from "./constants.js"
import { joinContentfulStrings } from "./helpers/format.js"
import { getMixPlayerForGuild } from "./mix/mix-player-manager.js"
import type { MixSong } from "./mix/mix.js"
import { observerReply } from "./observer-reply.js"

let currentId: NodeJS.Timer | undefined
let reply: ReplyHandle | undefined

export function showNowPlaying(context: InteractionContext, guildId: string) {
  if (currentId) clearInterval(currentId)
  reply?.delete()

  reply = observerReply(context, () => {
    const { currentSong, progressSeconds, songs } =
      getMixPlayerForGuild(guildId)

    if (!currentSong) {
      return "Nothing's playing at the moment."
    }

    const progressNormalized = Math.min(
      progressSeconds / currentSong.durationSeconds,
      1,
    )

    return [
      embedComponent(currentSongEmbed(currentSong, progressNormalized)),
      embedComponent(
        queueEmbed(songs, currentSong.durationSeconds - progressSeconds),
      ),
    ]
  })

  currentId = setInterval(() => {
    reply?.refresh()
  }, 3000)
}

function currentSongEmbed(
  song: MixSong,
  progress: number,
): MessageEmbedOptions {
  const progressWidth = 16
  const progressFilledCount = Math.round(progress * progressWidth)

  const progressBar =
    "🟪".repeat(progressFilledCount) +
    "⬛".repeat(progressWidth - progressFilledCount)

  const durationMs = song.durationSeconds * 1000

  const progressDisplay = prettyMilliseconds(progress * durationMs, {
    colonNotation: true,
    secondsDecimalDigits: 0,
  })

  const durationDisplay = prettyMilliseconds(durationMs, {
    colonNotation: true,
    secondsDecimalDigits: 0,
  })

  return {
    color: defaultEmbedColor,
    title: song.title,
    url: `https://youtu.be/${song.youtubeId}`,
    description: [
      `${progressDisplay} / ${durationDisplay}`,
      "",
      progressBar,
    ].join("\n"),
    author: {
      name: song.channelName,
      iconURL: song.channelAvatarUrl,
      url: song.channelUrl,
    },
    thumbnail: {
      url: song.thumbnailUrl,
    },
  }
}

function queueEmbed(
  songs: MixSong[],
  secondsUntilNextSong: number,
): MessageEmbedOptions {
  let time = secondsUntilNextSong

  const totalDurationSeconds = songs.reduce(
    (total, song) => total + song.durationSeconds,
    0,
  )

  return {
    color: defaultEmbedColor,
    title: "Queue",
    description: songs
      .slice(0, 5)
      .map((song) => {
        const durationDisplay = prettyMilliseconds(song.durationSeconds * 1000)
        const timeUntilPretty = prettyMilliseconds(Math.round(time) * 1000)

        time += song.durationSeconds

        return [
          `[**${song.title}**](https://youtu.be/${song.youtubeId})`,
          `${durationDisplay} ∙ playing in ${timeUntilPretty}`,
        ].join("\n")
      })
      .join("\n\n"),
    footer: {
      text: joinContentfulStrings(
        [
          songs.length > 5 && `+${songs.length - 5} songs`,
          `${prettyMilliseconds(totalDurationSeconds * 1000)} total`,
        ],
        " ∙ ",
      ),
    },
  }
}
