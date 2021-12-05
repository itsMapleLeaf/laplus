import { makeAutoObservable } from "mobx"
import type { MixSong } from "./mix-song.js"

export class MixQueue {
  songs: MixSong[] = []
  position = 0

  constructor() {
    makeAutoObservable(this)
  }

  reset() {
    this.songs = []
    this.position = 0
  }

  addSong(song: MixSong) {
    this.songs.push(song)
  }

  setSongs(songs: MixSong[]) {
    this.songs = songs
  }

  setPosition(position: number) {
    this.position = Math.max(0, position)
  }

  advance(count = 1) {
    this.setPosition(this.position + count)
  }

  get size() {
    return this.songs.length
  }

  get isEmpty() {
    return this.songs.length === 0
  }

  get currentSong() {
    return this.songs[this.position]
  }

  get upcomingSongs() {
    return this.songs.slice(this.position + 1)
  }
}
