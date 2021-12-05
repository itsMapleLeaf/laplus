import { Gatekeeper } from "@itsmapleleaf/gatekeeper"
import { Client, Intents } from "discord.js"
import "dotenv/config.js"
import { addMixCommands } from "./commands.new/mix.js"
import { raise } from "./helpers/errors.js"
import { RootStore } from "./root-store.js"
import { textChannelPresence } from "./singletons.js"

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
})

client.on("interactionCreate", (interaction) => {
  if (interaction.channel) {
    textChannelPresence.setTextChannel(interaction.channel)
  }
})

const root = new RootStore()

const gatekeeper = await Gatekeeper.create({
  name: "laplus",
  client,
})

addMixCommands(gatekeeper, root)

await client.login(process.env.BOT_TOKEN)

await root.lavalinkSocket.connect(client.user?.id ?? raise("Not logged in"))

await root.mixManager.hydrateMixes(client)
root.mixManager.persistMixes()
