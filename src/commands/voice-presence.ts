import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { requireVoiceChannel, withGuards } from "../command-guards.js"
import type { RootStore } from "../root-store.js"

export function addVoicePresenceCommands(
  gatekeeper: Gatekeeper,
  root: RootStore,
) {
  gatekeeper.addSlashCommand({
    name: "join",
    aliases: ["j"],
    description: "Politely ask La+ to join your voice channel.",
    run: withGuards((context) => {
      const channel = requireVoiceChannel(context)
      const mix = root.mixManager.createMix(channel.guild)
      mix.joinVoiceChannel(channel.id)
      mix.resume()
      context.reply(() => "**I am here.**")
    }),
  })

  gatekeeper.addSlashCommand({
    name: "leave",
    aliases: ["l"],
    description: "Politely ask La+ to leave your voice channel.",
    run: withGuards((context) => {
      const channel = requireVoiceChannel(context)
      const mix = root.mixManager.createMix(channel.guild)
      mix.leaveVoiceChannel()
      context.reply(() => "Bye for now. **I'll be back.**")
    }),
  })
}
