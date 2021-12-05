import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { embedComponent } from "@itsmapleleaf/gatekeeper"
import { Util } from "discord.js"
import { observable, runInAction } from "mobx"
import { requireVoiceChannel, withGuards } from "../command-guards.js"
import { confirm } from "../confirm.js"
import { defaultEmbedColor } from "../constants.js"
import { observerReply } from "../observer-reply.js"
import type { RootStore } from "../root-store.js"
import { findVideoByUserInput } from "../youtube.js"

export function addMixCommands(gatekeeper: Gatekeeper, root: RootStore) {
  gatekeeper.addSlashCommand({
    name: "mix",
    description: "Start a new mix",
    options: {
      song: {
        type: "STRING",
        description:
          "The song to play. Can be a YouTube URL, or a YouTube search query.",
        required: true,
      },
    },
    run: withGuards(async (context) => {
      const voiceChannel = requireVoiceChannel(context)
      const mix = root.mixManager.getMix(voiceChannel.guild)

      if (mix.isCollectingSongs) {
        context.reply(() => "This mix is busy. Try again later.")
        return
      }

      if (!mix.isEmpty) {
        const shouldContinue = await confirm({
          context,
          query: [
            "This mix already has stuff in it.",
            "Do you want to clear this mix and start a new one?",
          ],
          confirmLabel: "Start a new mix",
          confirmStyle: "DANGER",
          postChoiceContent: (shouldContinue) => {
            if (shouldContinue) {
              return "Starting a new mix. You can delete this message."
            }
            return "Alright, carry on. You can delete this message."
          },
        })

        if (!shouldContinue) return
      }

      const video = await findVideoByUserInput(context.options.song)
      if (!video) {
        context.reply(
          () => `Couldn't find a video for that. Try something else.`,
        )
        return
      }

      const done = observable.box(false)

      const { unsubscribe } = observerReply(context, () => [
        done.get() ? "Done." : "Finding songs...",
        embedComponent({
          color: defaultEmbedColor,
          title: `**${Util.escapeMarkdown(video.title)}**`,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          thumbnail: { url: video.thumbnails.min },
          description: [
            `Found **${mix.queue.length}** song(s)`,
            `Ignored **${mix.ignoredLiveCount}** stream(s)`,
            `Ignored **${mix.ignoredPlaylistCount}** playlist(s)`,
            `Ignored **${mix.ignoredLengthyCount}** long video(s)`,
          ].join("\n"),
          footer: {
            text: "Tip: In case you aren't finding many songs, individual songs work best to start with.",
          },
        }),
      ])

      await mix.collectSongs(video)
      runInAction(() => done.set(true))
      unsubscribe()

      mix.joinVoiceChannel(voiceChannel.id)
      await mix.play()
    }),
  })
}
