import { LavalinkSocket } from "./lavalink/lavalink-socket.js"
import { MixManager } from "./mix/mix-manager.js"

export class RootStore {
  lavalinkSocket = new LavalinkSocket()
  mixManager = new MixManager(this.lavalinkSocket)
}
