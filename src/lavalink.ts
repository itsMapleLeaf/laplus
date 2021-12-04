import type { VoiceConnectionReadyState } from "@discordjs/voice"
import * as discordVoice from "@discordjs/voice"
import type * as lavaclient from "@lavaclient/types"
import type { PlayerEvent, PlayerUpdateState } from "@lavaclient/types"
import { LoadType } from "@lavaclient/types"
import type { BaseGuildVoiceChannel, Client } from "discord.js"
import { observable } from "mobx"
import fetch from "node-fetch"
import { raise } from "./helpers/errors.js"
import { textChannelPresence } from "./singletons.js"
import { createSocket } from "./socket.js"

const lavalinkSocketUrl =
  process.env.LAVALINK_SOCKET ?? raise("LAVALINK_SOCKET not defined")

const lavalinkHttpUrl =
  process.env.LAVALINK_HTTP ?? raise("LAVALINK_HTTP not defined")

const lavalinkPassword =
  process.env.LAVALINK_PASSWORD ?? raise("LAVALINK_PASSWORD not defined")

const stats = observable.box<lavaclient.StatsData>({
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
  const message: lavaclient.IncomingMessage = JSON.parse(String(data))
  if (message.op === "stats") {
    console.info(`Lavalink stats`, message)
    stats.set(message)
  }
})

function send(message: lavaclient.OutgoingMessage) {
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
  guildId: string,
  onEvent: (event: PlayerEvent) => void,
) {
  let voiceChannel: BaseGuildVoiceChannel | undefined

  const state = observable.box<PlayerUpdateState>({
    connected: false,
    time: 0,
    position: 0,
  })

  socket.events.on("open", () => {
    if (voiceChannel) {
      connectToVoiceChannel(voiceChannel).catch(textChannelPresence.reportError)
    }
  })

  socket.events.on("message", (data) => {
    const message: lavaclient.IncomingMessage = JSON.parse(String(data))

    if (message.op === "playerUpdate") {
      console.info("Lavalink player update", message)
      state.set(message.state)
    }

    if (message.op === "event") {
      console.info("Lavalink event", message)
      onEvent(message)
    }
  })

  function handleVoiceConnectionNetworkingStateChange(
    state: VoiceConnectionReadyState["networking"]["state"],
  ) {
    if ("connectionOptions" in state) {
      const { sessionId, token, endpoint } = state.connectionOptions
      send({
        op: "voiceUpdate",
        guildId,
        sessionId,
        event: { token, endpoint },
      })
    }
  }

  function connectToVoiceChannel(channel: BaseGuildVoiceChannel) {
    const current = discordVoice.getVoiceConnection(guildId)
    if (current?.joinConfig.channelId === channel.id) {
      if (current.state.status === discordVoice.VoiceConnectionStatus.Ready) {
        handleVoiceConnectionNetworkingStateChange(
          current.state.networking.state,
        )
      }
      return Promise.resolve()
    }

    const connection = discordVoice.joinVoiceChannel({
      guildId,
      channelId: channel.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    })

    return new Promise<void>((resolve, reject) => {
      connection.on(discordVoice.VoiceConnectionStatus.Ready, (_, state) => {
        resolve()
        voiceChannel = channel
        handleVoiceConnectionNetworkingStateChange(state.networking.state)
        state.networking.on("stateChange", (_, state) => {
          handleVoiceConnectionNetworkingStateChange(state)
        })
      })
      connection.on("error", reject)
    })
  }

  return {
    get state(): Readonly<PlayerUpdateState> {
      return state.get()
    },

    connectToVoiceChannel,

    play(track: string) {
      send({ op: "play", guildId, track })
    },

    stop() {
      send({ op: "stop", guildId })
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

export async function loadLavalinkTrack(
  identifier: string,
): Promise<string | undefined> {
  const response = await fetch(
    `${lavalinkHttpUrl}/loadtracks?identifier=${identifier}`,
    {
      headers: { Authorization: lavalinkPassword },
    },
  )

  const result = (await response.json()) as lavaclient.LoadTracksResponse

  switch (result.loadType) {
    case LoadType.TrackLoaded:
    case LoadType.PlaylistLoaded:
    case LoadType.SearchResult:
      return result.tracks[0]?.track

    case LoadType.NoMatches:
      return undefined

    case LoadType.LoadFailed:
      throw new Error(result.exception.message)
  }
}

export function getLavalinkStats() {
  return stats.get()
}
