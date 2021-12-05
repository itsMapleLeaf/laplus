import type {
  IncomingMessage,
  OutgoingMessage,
  PlayerEvent,
  StatsData,
} from "@lavaclient/types"
import type {
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
} from "discord-api-types"
import type { Client } from "discord.js"
import { observable } from "mobx"
import { raise } from "../helpers/errors.js"
import { textChannelPresence } from "../singletons.js"
import { createSocket } from "../socket.js"
import { lavalinkPassword, lavalinkSocketUrl } from "./lavalink-constants.js"

export const stats = observable.box<StatsData>({
  players: 0,
  playingPlayers: 0,
  uptime: 0,
  memory: {
    allocated: 0,
    used: 0,
    free: 0,
    reservable: 0,
  },
  cpu: {
    systemLoad: 0,
    cores: 0,
    lavalinkLoad: 0,
  },
})

const socket = createSocket()

socket.events.on("message", (data) => {
  const message: IncomingMessage = JSON.parse(String(data))
  if (message.op === "stats") {
    console.info(`Lavalink stats`, message)
    stats.set(message)
  }
})

function send(message: OutgoingMessage) {
  socket?.send(JSON.stringify(message))
}

export function connectToLavalink(client: Client) {
  socket.connect(lavalinkSocketUrl, {
    headers: {
      "Authorization": lavalinkPassword,
      "User-Id": client.user?.id ?? raise("Bot user not found"),
      "Client-Name": "La+",
    },
  })
}

export function createLavalinkPlayer(
  client: Client,
  guildId: string,
  onEvent: (event: PlayerEvent) => void,
) {
  const state = observable({
    progressSeconds: 0,
    voiceChannelId: undefined as string | undefined,
  })

  let voiceSessionId: string | undefined
  let voiceToken: string | undefined
  let voiceEndpoint: string | undefined

  let currentTrack: string | undefined

  client.ws.on(
    "VOICE_STATE_UPDATE",
    (data: GatewayVoiceStateUpdateDispatchData) => {
      voiceSessionId = data.session_id
      sendVoiceUpdate()
    },
  )

  client.ws.on(
    "VOICE_SERVER_UPDATE",
    (packet: GatewayVoiceServerUpdateDispatchData) => {
      voiceEndpoint = packet.endpoint ?? undefined
      voiceToken = packet.token
      sendVoiceUpdate()
    },
  )

  socket.events.on("open", () => {
    if (state.voiceChannelId) {
      connectToVoiceChannel(state.voiceChannelId).catch(
        textChannelPresence.reportError,
      )
    }

    if (currentTrack) {
      send({ op: "play", guildId, track: currentTrack })
      send({ op: "seek", guildId, position: state.progressSeconds })
    }
  })

  socket.events.on("message", (data) => {
    const message: IncomingMessage = JSON.parse(String(data))
    if (message.op === "playerUpdate") {
      state.progressSeconds = (message.state.position ?? 0) / 1000
    }
    if (message.op === "event") {
      onEvent(message)
    }
  })

  async function connectToVoiceChannel(channelId: string): Promise<void> {
    state.voiceChannelId = channelId

    const guild =
      (await client.guilds.fetch(guildId)) ?? raise("Guild not found")

    guild.shard.send({
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: channelId,
        self_mute: false,
        self_deaf: true,
      },
    })
  }

  function sendVoiceUpdate() {
    if (voiceSessionId && voiceToken && voiceEndpoint) {
      send({
        op: "voiceUpdate",
        guildId,
        sessionId: voiceSessionId,
        event: { token: voiceToken, endpoint: voiceEndpoint },
      })
    }
  }

  return {
    get progressSeconds(): number {
      return state.progressSeconds
    },

    get voiceChannelId(): string | undefined {
      return state.voiceChannelId
    },

    connectToVoiceChannel,

    play(track: string) {
      send({ op: "play", guildId, track })
      currentTrack = track
    },

    stop() {
      send({ op: "stop", guildId })
      currentTrack = undefined
    },

    pause() {
      send({ op: "pause", guildId, pause: true })
    },

    resume() {
      send({ op: "pause", guildId, pause: false })
    },

    seek(seconds: number) {
      send({ op: "seek", guildId, position: seconds * 1000 })
    },
  }
}
