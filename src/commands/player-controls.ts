import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { clamp } from ".././helpers/clamp.js"
import {
  requirePlayer,
  requireVoiceChannel,
  withGuards,
} from "../command-guards.js"

export default function addCommands(gatekeeper: Gatekeeper) {
  gatekeeper.addSlashCommand({
    name: "pause",
    description: "Pause the current song.",
    run: withGuards((context) => {
      requirePlayer(context).pause()
      context.reply(() => "Paused.")
    }),
  })

  gatekeeper.addSlashCommand({
    name: "resume",
    description: "Resume playing.",
    run: withGuards(async (context) => {
      const channel = requireVoiceChannel(context)
      const player = requirePlayer(context)
      await player.joinVoiceChannel(channel)
      player.resume()
      context.reply(() => "Resumed.")
    }),
  })

  gatekeeper.addSlashCommand({
    name: "seek",
    description: "Seek to a time in the current song.",
    options: {
      time: {
        type: "NUMBER",
        description: "Time in seconds to seek to.",
        required: true,
      },
    },
    run: withGuards((context) => {
      const player = requirePlayer(context)

      if (!player.currentSong) {
        context.reply(() => "No song playing. Baka.")
        return
      }

      player.seek(
        clamp(context.options.time, 0, player.currentSong.durationSeconds),
      )

      context.reply(() => `Now playing at ${context.options.time} seconds.`)
    }),
  })

  gatekeeper.addSlashCommand({
    name: "clear",
    description: "Clear the current mix",
    run: withGuards((context) => {
      requirePlayer(context).clear()
      context.reply(() => "Mix cleared.")
    }),
  })
}
