import type { LoadTracksResponse } from "@lavaclient/types"
import { LoadType } from "@lavaclient/types"
import got from "got"
import { lavalinkHttpUrl, lavalinkPassword } from "./lavalink-constants.js"

export async function loadLavalinkTrack(
  identifier: string,
): Promise<string | undefined> {
  const url = new URL(lavalinkHttpUrl)
  url.pathname = "/loadtracks"
  url.searchParams.set("identifier", identifier)

  const result = await got(url, {
    headers: {
      Authorization: lavalinkPassword,
    },
  }).json<LoadTracksResponse>()

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
