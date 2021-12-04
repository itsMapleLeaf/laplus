import type { Gatekeeper, ReplyHandle } from "@itsmapleleaf/gatekeeper"
import { embedComponent } from "@itsmapleleaf/gatekeeper"
import prettyMilliseconds from "pretty-ms"
import { defaultEmbedColor } from "../constants.js"
import { getLavalinkStats } from "../lavalink.js"
import { observerReply } from "../observer-reply.js"

let reply: ReplyHandle | undefined

export default function addCommands(gatekeeper: Gatekeeper) {
  gatekeeper.addSlashCommand({
    name: "stats",
    description: "Slow audio player stats",
    run(context) {
      reply?.delete()

      reply = observerReply(context, () => {
        const stats = getLavalinkStats()
        const { sent = 0, nulled = 0, deficit = 0 } = stats.frameStats ?? {}

        return embedComponent({
          color: defaultEmbedColor,
          title: "Audio player stats",
          description: [
            `**${stats.players}** player(s)`,
            `**${stats.playingPlayers}** playing`,
            `running for **${prettyMilliseconds(stats.uptime, {
              secondsDecimalDigits: 0,
              verbose: true,
            })}**`,
          ].join("\n"),
          fields: [
            {
              name: "Memory",
              value: [
                `**${formatGigabytes(stats.memory.allocated)}** allocated`,
                `**${formatGigabytes(stats.memory.used)}** used`,
                `**${formatGigabytes(stats.memory.free)}** free`,
                `**${formatGigabytes(stats.memory.reservable)}** reservable`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "CPU",
              value: [
                `**${stats.cpu.cores}** core(s)`,
                `**${formatPercent(stats.cpu.systemLoad)}** system load`,
                `**${formatPercent(stats.cpu.lavalinkLoad)}** lavalink load`,
              ].join("\n"),
              inline: true,
            },
            {
              name: "Audio frames",
              value: [
                `**${sent}** sent`,
                `**${nulled}** nulled`,
                `**${deficit}** deficit`,
              ].join("\n"),
              inline: true,
            },
          ],
          footer: {
            text: "Ha, nerd.",
          },
        })
      })
    },
  })
}

function formatPercent(decimal: number) {
  return `${Math.round(decimal * 100)}%`
}

function formatGigabytes(bytes: number) {
  const oneGigabyte = 1024 ** 3
  return `${(bytes / oneGigabyte).toFixed(2)} GB`
}
