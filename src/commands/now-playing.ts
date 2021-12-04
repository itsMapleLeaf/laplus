import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { requireGuild, withGuards } from "../command-guards.js"
import { showNowPlaying } from "../now-playing-message.js"

export default function addCommands(gatekeeper: Gatekeeper) {
  gatekeeper.addSlashCommand({
    name: "now-playing",
    aliases: ["np"],
    description: "Show the currently playing song and the queue.",
    run: withGuards((context) => {
      const guild = requireGuild(context)
      showNowPlaying(context, guild.id)
    }),
  })
}
