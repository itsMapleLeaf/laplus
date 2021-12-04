import type { MixPlayer } from "./mix-player.js"
import { createMixPlayer } from "./mix-player.js"

const players: Record<string, MixPlayer> = {}

export function getMixPlayerForGuild(guildId: string): MixPlayer {
  return (players[guildId] ??= createMixPlayer(guildId))
}
