import { LavalinkSocket } from "./lavalink.new/lavalink-socket.js"
import { MixManager } from "./mix.new/mix-manager.js"

export class RootStore {
  lavalinkSocket = new LavalinkSocket()
  mixManager = new MixManager(this.lavalinkSocket)
}
