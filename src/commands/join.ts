import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import {
  requirePlayer,
  requireVoiceChannel,
  withGuards,
} from "../command-guards.js"

export default function addCommands(gatekeeper: Gatekeeper) {
  gatekeeper.addSlashCommand({
    name: "join",
    description: "Nicely ask La+ to grace her presence in your voice channel.",

    run: withGuards(async (context) => {
      const voiceChannel = requireVoiceChannel(context)
      const player = requirePlayer(context)
      await player.joinVoiceChannel(voiceChannel.id)
      context.reply(() => "I am here.")
    }),
  })
}
