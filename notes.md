## commands

- /mix (url)
  - [x] queue input url
  - [x] queue related
  - [x] skip songs over a certain length
  - [x] if there's already a mix, add a confirmation message to replace it
- [x] /now-playing
- [x] /skip (count=1)
- [x] /clear
- [x] /pause and /resume
- [x] /seek (seconds)
- [x] /stats
- /remove
  - [ ] show a dropdown menu with all of the songs in the queue
  - [ ] click to uncheck songs, all initially checked
  - [ ] remove all unchecked songs (keep checked songs)
  - [ ] paginate this
  - [ ] consider an autocomplete option when that comes out

## internal

- [x] on errors, show the related url that couldn't load
- [ ] proper logger
- [x] lavalink reconnection

## features

- [ ] get more related videos when queue ends
- persist player state via github gist
  - [ ] current playing song
  - [ ] queue
  - [ ] song position
  - [ ] voice channel - re-join the channel on startup
- [ ] role-based permissions
- [ ] saved mixes + switching between them
  - remove the mix replace confirmation if adding this

## now playing / queue

- now playing
  - [x] title / url
  - [x] channel name
  - [ ] channel avatar?
  - [x] thumbnail
  - [x] progress / duration
  - [x] progress bar
  - [ ] seed song
  - [ ] mix author
- queue (next 5)
  - [x] **[title](url)** [duration]
  - [x] (additional song count) ∙ (total queue duration)
- [ ] arrows to navigate pages
- [ ] close button

## bugs

- [x] fix streams sometimes ending early with no error (fixed by using lavalink)
  - at the moment, the queue player tries to advance immediately when going idle. it should wait a bit (presumably for the network to wake up again), _then_ advance if still idle
- [x] errors get shown twice
- [x] sometimes 403 happens and stops the stream, but if seeking works, can use that as a form of recovery (fixed with lavalink)
- [x] retry on 403 when running ytdl
- [x] don't show "0 skipped"
