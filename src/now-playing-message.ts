import type { InteractionContext, ReplyHandle } from "@itsmapleleaf/gatekeeper"
import { buttonComponent, embedComponent } from "@itsmapleleaf/gatekeeper"
import type { MessageEmbedOptions } from "discord.js"
import { action, observable } from "mobx"
import prettyMilliseconds from "pretty-ms"
import { defaultEmbedColor } from "./constants.js"
import { clamp } from "./helpers/clamp.js"
import { joinContentfulStrings } from "./helpers/format.js"
import type { MixSong } from "./mix/mix-song.js"
import type { Mix } from "./mix/mix.js"
import { observerReply } from "./observer-reply.js"

const itemsPerPage = 5

let currentId: NodeJS.Timer | undefined
let reply: ReplyHandle | undefined

export function showNowPlaying(context: InteractionContext, mix: Mix) {
  if (currentId) clearInterval(currentId)
  reply?.delete()

  const state = observable({
    pageCursor: undefined as string | undefined,
  })

  reply = observerReply(context, () => {
    if (!mix.queue.currentSong) {
      return "Nothing's playing at the moment."
    }

    const totalPages = Math.ceil(mix.queue.size / itemsPerPage)
    const pageMax = totalPages * itemsPerPage

    const pageStart = (() => {
      if (state.pageCursor == null) return 0
      return clamp(
        mix.queue.songs.findIndex(
          (song) => song.youtubeId === state.pageCursor,
        ),
        0,
        pageMax,
      )
    })()

    const pageNumber = Math.floor(pageStart / itemsPerPage) + 1

    const goToPage = action((page: number) => {
      const actualPage = clamp(Math.floor(page / 5) * 5, 0, pageMax)
      state.pageCursor = mix.queue.songs[actualPage]?.youtubeId
    })

    const progressNormalized = Math.min(
      mix.progressSeconds / mix.queue.currentSong.durationSeconds,
      1,
    )

    return [
      embedComponent(
        currentSongEmbed(
          mix.queue.currentSong,
          progressNormalized,
          mix.queue.position,
          mix.paused,
        ),
      ),
      embedComponent(
        queueEmbed(
          mix.queue.upcomingSongs,
          mix.queue.currentSong.durationSeconds - mix.progressSeconds,
          pageStart,
          pageNumber,
          totalPages,
        ),
      ),
      buttonComponent({
        label: "",
        emoji: "⬅",
        style: "SECONDARY",
        disabled: pageStart === 0,
        onClick: () => {
          goToPage(pageStart - 5)
        },
      }),
      buttonComponent({
        label: "",
        emoji: "➡",
        style: "SECONDARY",
        disabled: pageStart + itemsPerPage >= mix.queue.size,
        onClick: () => {
          goToPage(pageStart + 5)
        },
      }),
    ]
  })

  currentId = setInterval(() => {
    reply?.refresh()
  }, 3000)
}

function currentSongEmbed(
  song: MixSong,
  progress: number,
  queuePosition: number,
  paused: boolean,
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
      `${progressDisplay} / ${durationDisplay}${paused ? " (paused)" : ""}`,
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
    footer: {
      text: `#${queuePosition + 1} in queue`,
    },
  }
}

function queueEmbed(
  songs: MixSong[],
  secondsUntilNextSong: number,
  pageStart: number,
  pageNumber: number,
  totalPages: number,
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
      .slice(pageStart, pageStart + itemsPerPage)
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
          `page ${pageNumber} of ${totalPages}`,
        ],
        " ∙ ",
      ),
    },
  }
}
