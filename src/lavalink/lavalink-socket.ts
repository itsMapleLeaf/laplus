import type {
  IncomingMessage,
  OutgoingMessage,
  PlayerEvent,
  PlayerUpdate,
  StatsData,
} from "@lavaclient/types"
import { makeAutoObservable } from "mobx"
import type { RawData } from "ws"
import { createEmitter } from "../helpers/emitter.js"
import { raise } from "../helpers/errors.js"
import { createSocket } from "../socket.js"
import { lavalinkPassword, lavalinkSocketUrl } from "./lavalink-constants.js"

export class LavalinkSocket {
  socket = createSocket()
  connected = false

  onOpen = createEmitter()
  onPlayerEvent = createEmitter<PlayerEvent>()
  onPlayerUpdate = createEmitter<PlayerUpdate>()

  stats: StatsData = {
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
  }

  constructor() {
    makeAutoObservable(this, {
      socket: false,
      onOpen: false,
      onPlayerEvent: false,
      onPlayerUpdate: false,
    })

    this.socket.events.on("open", this.handleOpen)
    this.socket.events.on("close", this.handleClose)
    this.socket.events.on("message", this.handleMessage)
  }

  connect(clientUserId: string) {
    this.socket.connect(lavalinkSocketUrl, {
      headers: {
        "Authorization": lavalinkPassword,
        "User-Id": clientUserId ?? raise("Bot not logged in"),
        "Client-Name": "La+",
      },
    })

    return new Promise((resolve) => {
      this.socket.events.once("open", resolve)
    })
  }

  send(message: OutgoingMessage) {
    this.socket.send(JSON.stringify(message))
  }

  handleOpen = () => {
    this.connected = true
    this.onOpen.emit()
  }

  handleClose = () => {
    this.connected = false
  }

  handleMessage = (data: RawData) => {
    const message: IncomingMessage = JSON.parse(String(data))
    if (message.op === "stats") {
      this.stats = message
    }
    if (message.op === "playerUpdate") {
      this.onPlayerUpdate.emit(message)
    }
    if (message.op === "event") {
      this.onPlayerEvent.emit(message)
    }
  }
}
