import type { Guild } from "discord.js"
import { makeAutoObservable } from "mobx"
import type { LavalinkSocket } from "../lavalink.new/lavalink-socket.js"
import { Mix } from "./mix.js"

export class MixManager {
  mixes = new Map<string, Mix>()

  constructor(readonly socket: LavalinkSocket) {
    makeAutoObservable(this, {
      getMix: false,
    })
  }

  getMix(guild: Guild) {
    return this.mixes.get(guild.id) ?? this.createMix(guild)
  }

  createMix(guild: Guild) {
    const mix = new Mix(guild, this.socket)
    this.mixes.set(guild.id, mix)
    return mix
  }
}
