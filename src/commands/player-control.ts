import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { Util } from "discord.js"
import {
  requireGuild,
  requireVoiceChannel,
  withGuards,
} from "../command-guards.js"
import { joinContentfulStrings } from "../helpers/format.js"
import type { RootStore } from "../root-store.js"

export function addPlayerControlCommands(
  gatekeeper: Gatekeeper,
  root: RootStore,
) {
  gatekeeper.addSlashCommand({
    name: "skip",
    description: "Skip one or more songs, including the current one.",
    options: {
      count: {
        type: "NUMBER",
        description:
          "The number of songs to skip, one by default. Negative numbers will go backwards.",
      },
    },
    run: withGuards(async (context) => {
      const mix = root.mixManager.getMix(requireGuild(context))

      const { currentSong } = mix.queue
      if (!currentSong) {
        context.reply(() => `Nothing's playing. Baka.`)
        return
      }

      const { count = 1 } = context.options
      await mix.playNext(count)

      context.reply(() =>
        joinContentfulStrings(
          [
            `Skipped **${Util.escapeMarkdown(currentSong.title)}**`,
            count > 1 && `and ${count - 1} other(s)`,
          ],
          " ",
        ),
      )
    }),
  })

  gatekeeper.addSlashCommand({
    name: "pause",
    description: "Pause the current song.",
    run: withGuards((context) => {
      root.mixManager.getMix(requireGuild(context)).pause()
      context.reply(() => `Paused.`)
    }),
  })

  gatekeeper.addSlashCommand({
    name: "resume",
    description: "Resume playing.",
    run: withGuards((context) => {
      const voiceChannel = requireVoiceChannel(context)
      const mix = root.mixManager.getMix(voiceChannel.guild)
      mix.resume()
      mix.joinVoiceChannel(voiceChannel.id)
      context.reply(() => `Resumed.`)
    }),
  })

  gatekeeper.addSlashCommand({
    name: "seek",
    description: "Seek to a specific time in the current song.",
    options: {
      time: {
        type: "NUMBER",
        description: "The time to seek to, in seconds.",
        required: true,
      },
    },
    run: withGuards((context) => {
      const mix = root.mixManager.getMix(requireGuild(context))

      const { currentSong } = mix.queue
      if (!currentSong) {
        context.reply(() => `Nothing's playing. Baka.`)
        return
      }

      const { time } = context.options
      if (time < 0 || time > currentSong.durationSeconds) {
        context.reply(() => [
          `Time must be between 0 and ${currentSong.durationSeconds}. Baka.`,
        ])
        return
      }

      mix.seek(time)
      context.reply(() => `Now playing from ${time} seconds.`)
    }),
  })

  gatekeeper.addSlashCommand({
    name: "clear",
    aliases: ["reset"],
    description: "Clear the queue and stop the current song.",
    run: withGuards((context) => {
      const guild = requireGuild(context)
      const mix = root.mixManager.getMix(guild)
      mix.reset()
      context.reply(() => `Cleared.`)
    }),
  })
}
