import { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { Client, Intents } from "discord.js"
import "dotenv/config.js"
import { addMixCommands } from "./commands/mix.js"
import { addNowPlayingCommand } from "./commands/now-playing.js"
import { addPlayerControlCommands } from "./commands/player-control.js"
import { addStatsCommand } from "./commands/stats.js"
import { raise } from "./helpers/errors.js"
import { RootStore } from "./root-store.js"

const root = new RootStore()

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
})

client.on("interactionCreate", (interaction) => {
  if (interaction.channel) {
    root.textChannelPresence.setChannel(interaction.channel)
  }
})

const gatekeeper = await Gatekeeper.create({
  name: "laplus",
  client,
})

addMixCommands(gatekeeper, root)
addNowPlayingCommand(gatekeeper, root)
addPlayerControlCommands(gatekeeper, root)
addStatsCommand(gatekeeper, root)

await client.login(process.env.BOT_TOKEN)

await root.lavalinkSocket.connect(client.user?.id ?? raise("Not logged in"))

await root.mixManager.hydrateMixes(client)
root.mixManager.persistMixes()
