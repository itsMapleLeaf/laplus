import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { embedComponent } from "@itsmapleleaf/gatekeeper"
import { Util } from "discord.js"
import { logErrorStack } from ".././helpers/errors.js"
import { requireVoiceChannel, withGuards } from "../command-guards.js"
import { confirm } from "../confirm.js"
import { defaultEmbedColor } from "../constants.js"
import { errorEmbedOptions } from "../error-embed.js"
import { getMixPlayerForGuild } from "../mix/mix-player-manager.js"
import { showNowPlaying } from "../now-playing-message.js"
import { observerReply } from "../observer-reply.js"
import { findVideoByUserInput } from "../youtube.js"

export default function addCommands(gatekeeper: Gatekeeper) {
  gatekeeper.addSlashCommand({
    name: "mix",
    description: "Start a mix",
    options: {
      song: {
        type: "STRING",
        description:
          "The song to play. Can be a YouTube URL, or a YouTube search query.",
        required: true,
      },
    },

    run: withGuards(async (context) => {
      try {
        const voiceChannel = requireVoiceChannel(context)

        const player = await getMixPlayerForGuild(voiceChannel.guildId)
        await player.joinVoiceChannel(voiceChannel.id)

        if (player.mix.isCollectingSongs) {
          context.reply(() => "This mix is busy. Try again later.")
          return
        }

        if (!player.mix.isEmpty) {
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

        const { unsubscribe } = observerReply(context, () => [
          "Finding songs...",
          embedComponent({
            color: defaultEmbedColor,
            title: `**${Util.escapeMarkdown(video.title)}**`,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            thumbnail: { url: video.thumbnails.min },
            description: [
              `Found **${player.songs.length}** song(s)`,
              `Ignored **${player.mix.store.ignoredLiveCount}** stream(s)`,
              `Ignored **${player.mix.store.ignoredPlaylistCount}** playlist(s)`,
              `Ignored **${player.mix.store.ignoredLengthyCount}** long video(s)`,
            ].join("\n"),
            footer: {
              text: "Tip: In case you aren't finding many songs, individual songs work best to start with.",
            },
          }),
        ])

        await player.mix.collectSongs(video)
        unsubscribe()

        await player.playNext()

        showNowPlaying(context, voiceChannel.guildId)
      } catch (error) {
        context.reply(() => embedComponent(errorEmbedOptions(error)))
        logErrorStack(error)
      }
    }),
  })
}
