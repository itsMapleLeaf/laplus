import type { InteractionContext, ReplyHandle } from "@itsmapleleaf/gatekeeper"
import { buttonComponent, embedComponent } from "@itsmapleleaf/gatekeeper"
import type { MessageEmbedOptions } from "discord.js"
import { makeAutoObservable } from "mobx"
import prettyMilliseconds from "pretty-ms"
import { defaultEmbedColor } from "./constants.js"
import { joinContentfulStrings } from "./helpers/format.js"
import type { MixSong } from "./mix/mix-song.js"
import type { Mix } from "./mix/mix.js"
import { observerReply } from "./observer-reply.js"
import { Pager } from "./pager.js"

const instances = new Map<string, NowPlayingReply>()

export function showNowPlayingReply(context: InteractionContext, mix: Mix) {
  instances.get(mix.guild.id)?.destroy()
  instances.set(mix.guild.id, new NowPlayingReply(context, mix))
}

class NowPlayingReply {
  private context: InteractionContext
  private mix: Mix
  private pager: Pager<MixSong>
  private reply: ReplyHandle

  constructor(context: InteractionContext, mix: Mix) {
    makeAutoObservable<this, "context" | "mix" | "reply">(this, {
      context: false,
      mix: false,
      reply: false,
    })

    this.context = context
    this.mix = mix
    this.pager = new Pager(() => this.mix.queue.upcomingSongs)
    this.reply = this.createReply()
  }

  destroy() {
    this.reply.delete()
  }

  private createReply(): ReplyHandle {
    return observerReply(this.context, () => {
      const { currentSong } = this.mix.queue
      if (!currentSong) return "Nothing's playing at the moment."

      return [
        embedComponent(this.getCurrentSongEmbedOptions(currentSong)),
        embedComponent(this.getQueueEmbedOptions(currentSong)),
        this.pager.pageCount > 1 &&
          buttonComponent({
            label: "",
            emoji: "⬅",
            style: "SECONDARY",
            disabled: !this.pager.hasPrevious,
            onClick: () => this.pager.previous(),
          }),
        this.pager.pageCount > 1 &&
          buttonComponent({
            label: "",
            emoji: "➡",
            style: "SECONDARY",
            disabled: !this.pager.hasNext,
            onClick: () => this.pager.next(),
          }),
      ]
    })
  }

  private getCurrentSongEmbedOptions(song: MixSong): MessageEmbedOptions {
    const durationMs = song.durationSeconds * 1000

    const progressWidth = 16

    const progressNormal = Math.min(
      this.mix.progressSeconds / song.durationSeconds,
      1,
    )

    const progressFilledCount = Math.round(progressNormal * progressWidth)

    const progressBar =
      "🟪".repeat(progressFilledCount) +
      "⬛".repeat(progressWidth - progressFilledCount)

    const progressDisplay = prettyMilliseconds(
      this.mix.progressSeconds * 1000,
      {
        colonNotation: true,
        secondsDecimalDigits: 0,
      },
    )

    const durationDisplay = prettyMilliseconds(durationMs, {
      colonNotation: true,
      secondsDecimalDigits: 0,
    })

    return {
      color: defaultEmbedColor,
      title: song.title,
      url: `https://youtu.be/${song.youtubeId}`,
      description: [
        joinContentfulStrings(
          [
            `${progressDisplay} / ${durationDisplay}`,
            this.mix.paused ? "(paused)" : "",
          ],
          " ",
        ),
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
        text: `#${this.mix.queue.position + 1} in queue`,
      },
    }
  }

  private getQueueEmbedOptions(song: MixSong): MessageEmbedOptions {
    const songs = this.mix.queue.upcomingSongs

    const totalDurationSeconds = songs.reduce(
      (total, song) => total + song.durationSeconds,
      0,
    )

    let currentTime = song.durationSeconds - this.mix.progressSeconds

    return {
      color: defaultEmbedColor,
      title: "Queue",
      description: this.pager.pageItems
        .map((song) => {
          const durationDisplay = prettyMilliseconds(
            song.durationSeconds * 1000,
          )
          const timeUntilPretty = prettyMilliseconds(
            Math.round(currentTime) * 1000,
          )

          currentTime += song.durationSeconds

          return [
            `[**${song.title}**](https://youtu.be/${song.youtubeId})`,
            `${durationDisplay} ∙ playing in ${timeUntilPretty}`,
          ].join("\n")
        })
        .join("\n\n"),
      footer: {
        text: joinContentfulStrings(
          [
            songs.length > 5 && `+${songs.length - 5} more songs`,
            `${prettyMilliseconds(totalDurationSeconds * 1000)} total`,
            this.pager.pageCount > 1 &&
              `page ${this.pager.page + 1} of ${this.pager.pageCount}`,
          ],
          " ∙ ",
        ),
      },
    }
  }
}
