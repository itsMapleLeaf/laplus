import type { PlayerEvent, PlayerUpdate } from "@lavaclient/types"
import type {
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdate,
  GatewayVoiceStateUpdateDispatchData,
} from "discord-api-types"
import type { Guild } from "discord.js"
import { makeAutoObservable } from "mobx"
import { z } from "zod"
import { loadLavalinkTrack } from "../lavalink/lavalink-http.js"
import type { LavalinkSocket } from "../lavalink/lavalink-socket.js"
import type { TextChannelPresence } from "../text-channel-presence.js"
import { MixQueue } from "./mix-queue.js"
import { mixSongSchema } from "./mix-song.js"

type SerializedMix = z.infer<typeof serializedMixSchema>
export const serializedMixSchema = z.object({
  queue: z.array(mixSongSchema),
  queuePosition: z.number(),
  paused: z.boolean(),
  progressSeconds: z.number(),
  voiceChannelId: z.string().optional(),
})

export class Mix {
  queue = new MixQueue()
  paused = false
  progressSeconds = 0

  voiceChannelId?: string
  voiceSessionId?: string
  voiceEndpoint?: string
  voiceToken?: string

  constructor(
    readonly guild: Guild,
    readonly socket: LavalinkSocket,
    readonly textChannelPresence: TextChannelPresence,
  ) {
    makeAutoObservable(this, {
      guild: false,
      socket: false,
      textChannelPresence: false,
    })

    socket.onOpen.listen(this.handleSocketOpen)
    socket.onPlayerUpdate.listen(this.handlePlayerUpdate)
    socket.onPlayerEvent.listen(this.handlePlayerEvent)

    guild.client.ws.on("VOICE_STATE_UPDATE", this.handleVoiceStateUpdate)
    guild.client.ws.on("VOICE_SERVER_UPDATE", this.handleVoiceServerUpdate)
  }

  handleSocketOpen = () => {
    if (this.voiceChannelId) {
      this.joinVoiceChannel(this.voiceChannelId)
      this.playWithCurrentState().catch(this.textChannelPresence.reportError)
    }
  }

  handlePlayerUpdate = (data: PlayerUpdate) => {
    if (data.guildId === this.guild.id) {
      this.progressSeconds = (data.state.position ?? 0) / 1000
    }
  }

  handlePlayerEvent = (event: PlayerEvent) => {
    if (event.type === "TrackEndEvent" && event.reason === "FINISHED") {
      this.playNext().catch(this.textChannelPresence.reportError)
    }

    if (event.type === "TrackStuckEvent") {
      console.warn("Track stuck", { event, song: this.queue.currentSong })
      this.playWithCurrentState().catch(this.textChannelPresence.reportError)
    }

    if (event.type === "TrackExceptionEvent") {
      console.warn(`Track exception: ${event.error}`)
      this.playWithCurrentState().catch(this.textChannelPresence.reportError)
    }
  }

  handleVoiceStateUpdate = (data: GatewayVoiceStateUpdateDispatchData) => {
    if (data.guild_id === this.guild.id) {
      this.voiceSessionId = data.session_id
      this.sendLavalinkVoiceUpdate()
    }
  }

  handleVoiceServerUpdate = (data: GatewayVoiceServerUpdateDispatchData) => {
    if (data.guild_id === this.guild.id) {
      this.voiceEndpoint = data.endpoint ?? undefined
      this.voiceToken = data.token
      this.sendLavalinkVoiceUpdate()
    }
  }

  sendLavalinkVoiceUpdate() {
    if (
      this.voiceChannelId &&
      this.voiceSessionId &&
      this.voiceEndpoint &&
      this.voiceToken
    ) {
      this.socket.send({
        op: "voiceUpdate",
        guildId: this.guild.id,
        sessionId: this.voiceSessionId,
        event: {
          endpoint: this.voiceEndpoint,
          token: this.voiceToken,
        },
      })
    }
  }

  joinVoiceChannel(channelId: string) {
    this.voiceChannelId = channelId

    // https://discord.com/developers/docs/topics/voice-connections#retrieving-voice-server-information-gateway-voice-state-update-example
    const payload: GatewayVoiceStateUpdate = {
      op: 4,
      d: {
        guild_id: this.guild.id,
        channel_id: channelId,
        self_mute: false,
        self_deaf: true,
      },
    }
    this.guild.shard.send(payload)
  }

  async play({ startSeconds = 0, paused = false } = {}): Promise<void> {
    const song = this.queue.currentSong
    if (!song) return

    const track = await loadLavalinkTrack(song.youtubeId)
    if (!track) {
      this.textChannelPresence.reportError(
        `Failed to load track for ${song.title} by id ${song.youtubeId}`,
      )
      return this.playNext()
    }

    // song changed since we started loading it
    if (song !== this.queue.currentSong) return

    this.socket.send({
      op: "play",
      guildId: this.guild.id,
      track,
      startTime: startSeconds * 1000,
      pause: paused,
    })
  }

  playNext(count = 1) {
    this.queue.advance(count)
    return this.play()
  }

  playWithCurrentState() {
    return this.play({
      startSeconds: this.progressSeconds,
      paused: this.paused,
    })
  }

  pause() {
    this.paused = true
    this.socket.send({ op: "pause", guildId: this.guild.id, pause: true })
  }

  resume() {
    this.paused = false
    this.socket.send({ op: "pause", guildId: this.guild.id, pause: false })
  }

  seek(seconds: number) {
    this.socket.send({
      op: "seek",
      guildId: this.guild.id,
      position: seconds * 1000,
    })
  }

  hydrate(data: SerializedMix) {
    this.queue.setSongs(data.queue)
    this.queue.setPosition(data.queuePosition)
    this.paused = data.paused
    this.progressSeconds = data.progressSeconds
    this.voiceChannelId = data.voiceChannelId

    if (data.voiceChannelId) {
      this.joinVoiceChannel(data.voiceChannelId)
    }

    return this.play({
      paused: data.paused,
      startSeconds: data.progressSeconds,
    })
  }

  get serialized(): SerializedMix {
    return {
      queue: this.queue.songs,
      queuePosition: this.queue.position,
      paused: this.paused,
      progressSeconds: this.progressSeconds,
      voiceChannelId: this.voiceChannelId,
    }
  }
}
