import { LoadTracksResponse, LoadType } from "@lavaclient/types"
import fetch from "node-fetch"
import { lavalinkHttpUrl, lavalinkPassword } from "./lavalink-constants.js"

export async function loadLavalinkTrack(
  identifier: string,
): Promise<string | undefined> {
  const response = await fetch(
    `${lavalinkHttpUrl}/loadtracks?identifier=${identifier}`,
    {
      headers: { Authorization: lavalinkPassword },
    },
  )

  const result = (await response.json()) as LoadTracksResponse

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
