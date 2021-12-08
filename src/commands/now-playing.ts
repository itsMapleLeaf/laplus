import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { requireGuild, withGuards } from "../command-guards.js"
import { showNowPlayingReply } from "../now-playing-reply.js"
import type { RootStore } from "../root-store.js"

export function addNowPlayingCommand(gatekeeper: Gatekeeper, root: RootStore) {
  gatekeeper.addSlashCommand({
    name: "now-playing",
    aliases: ["np", "queue"],
    description: "Shows the current playing song and queue",
    run: withGuards((context) => {
      showNowPlayingReply(
        context,
        root.mixManager.getMix(requireGuild(context)),
      )
    }),
  })
}
