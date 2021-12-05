import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { requireGuild, withGuards } from "../command-guards.js"
import { showNowPlaying } from "../now-playing-message.js"
import type { RootStore } from "../root-store.js"

export function addNowPlayingCommand(gatekeeper: Gatekeeper, root: RootStore) {
  gatekeeper.addSlashCommand({
    name: "now-playing",
    aliases: ["np"],
    description: "Shows the current playing song and queue",
    run: withGuards((context) => {
      showNowPlaying(context, root.mixManager.getMix(requireGuild(context)))
    }),
  })
}
