import type { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { embedComponent } from "@itsmapleleaf/gatekeeper"
import { Util } from "discord.js"
import { logErrorStack } from ".././helpers/errors.js"
import { joinContentfulStrings } from ".././helpers/format.js"
import { isPositiveInteger } from ".././helpers/is-positive-integer.js"
import { requireGuild, withGuards } from "../command-guards.js"
import { errorEmbedOptions } from "../error-embed.js"
import { getMixPlayerForGuild } from "../mix/mix-player-manager.js"

export default function addCommands(gatekeeper: Gatekeeper) {
  gatekeeper.addSlashCommand({
    name: "skip",
    description: "Skip one or more songs.",
    options: {
      count: {
        type: "NUMBER",
        description:
          "The number of songs to skip, including the current song. One by default.",
      },
    },
    run: withGuards(async (context) => {
      const guild = requireGuild(context)

      const count = context.options.count ?? 1
      if (!isPositiveInteger(count)) {
        context.reply(() => "Positive whole numbers only. Baka.")
        return
      }

      const player = getMixPlayerForGuild(guild.id)
      const song = player.currentSong
      if (!song) {
        context.reply(() => "Nothing to skip. Baka.")
        return
      }

      try {
        await player.skip(count)
        context.reply(() =>
          joinContentfulStrings(
            [
              `Skipped **${Util.escapeMarkdown(song.title)}**`,
              count > 1 && `(and ${count - 1} other song(s))`,
            ],
            " ",
          ),
        )
      } catch (error) {
        context.reply(() => embedComponent(errorEmbedOptions(error)))
        logErrorStack(error)
      }
    }),
  })
}
