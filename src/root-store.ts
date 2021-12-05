import { LavalinkSocket } from "./lavalink/lavalink-socket.js"
import { MixManager } from "./mix/mix-manager.js"
import { TextChannelPresence } from "./text-channel-presence.js"

export class RootStore {
  textChannelPresence = new TextChannelPresence()
  lavalinkSocket = new LavalinkSocket()
  mixManager = new MixManager(this.lavalinkSocket, this.textChannelPresence)
}
