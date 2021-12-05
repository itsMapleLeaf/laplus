import type {
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdate,
  GatewayVoiceStateUpdateDispatchData,
} from "discord-api-types"
import type { Guild } from "discord.js"
import { makeAutoObservable, runInAction } from "mobx"
import type { LavalinkSocket } from "../lavalink.new/lavalink-socket.js"
import type { MixSong } from "../mix/mix-song.js"
import type { RelatedResult, YoutubeVideo } from "../youtube.js"
import { findRelated, isLiveVideo, isPlaylist } from "../youtube.js"

const maxDurationSeconds = 60 * 15

export class Mix {
  queue: MixSong[] = []
  queuePosition = 0
  playing = false
  progressSeconds = 0

  isCollectingSongs = false
  ignoredLiveCount = 0
  ignoredPlaylistCount = 0
  ignoredLengthyCount = 0

  voiceChannelId?: string
  voiceSessionId?: string
  voiceEndpoint?: string
  voiceToken?: string

  constructor(readonly guild: Guild, readonly socket: LavalinkSocket) {
    makeAutoObservable(this, {
      guild: false,
      socket: false,
    })

    socket.onOpen.listen(this.handleSocketOpen)

    guild.client.ws.on("VOICE_STATE_UPDATE", this.handleVoiceStateUpdate)
    guild.client.ws.on("VOICE_SERVER_UPDATE", this.handleVoiceServerUpdate)
  }

  handleSocketOpen = () => {
    if (this.voiceChannelId) {
      this.joinVoiceChannel(this.voiceChannelId)
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

  get isEmpty() {
    return this.queue.length === 0
  }

  reset() {
    this.queue = []
    this.queuePosition = 0
    this.ignoredLiveCount = 0
    this.ignoredPlaylistCount = 0
    this.ignoredLengthyCount = 0
    this.isCollectingSongs = true
  }

  async collectSongs(video: YoutubeVideo) {
    if (this.isCollectingSongs) {
      console.warn("Already collecting songs")
      return
    }

    try {
      this.isCollectingSongs = true
      this.addSongsFromYoutubeResults([video, ...video.related])
      for await (const results of findRelated(video)) {
        this.addSongsFromYoutubeResults(results)
      }
    } finally {
      runInAction(() => {
        this.isCollectingSongs = false
      })
    }
  }

  addSongsFromYoutubeResults(results: Array<YoutubeVideo | RelatedResult>) {
    for (const result of results) {
      if (isLiveVideo(result)) {
        this.ignoredLiveCount += 1
        continue
      }

      if (isPlaylist(result)) {
        this.ignoredPlaylistCount += 1
        continue
      }

      const durationSeconds = result.duration ?? Infinity
      if (durationSeconds > maxDurationSeconds) {
        this.ignoredLengthyCount += 1
        continue
      }

      this.queue.push({
        title: result.title,
        durationSeconds,
        thumbnailUrl: result.thumbnails.min,
        channelName: result.channel?.name,
        channelUrl: result.channel?.url,
        channelAvatarUrl: result.channel?.thumbnails?.min,
        youtubeId: result.id,
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

  play() {
    this.playing = true
  }

  pause() {
    this.playing = false
  }
}
