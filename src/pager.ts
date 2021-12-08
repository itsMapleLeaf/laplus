import type { IComputedValue } from "mobx"
import { computed, makeAutoObservable } from "mobx"
import { clamp } from "./helpers/clamp.js"

export class Pager<T> {
  private _page = 0
  private items: IComputedValue<T[]>
  private itemsPerPage = 5

  constructor(getItems: () => T[]) {
    makeAutoObservable(this)
    this.items = computed(getItems)
  }

  next() {
    this._page += 1
  }

  previous() {
    this._page -= 1
  }

  get page() {
    return clamp(this._page, 0, this.pageCount - 1)
  }

  get pageCount() {
    return Math.ceil(this.items.get().length / this.itemsPerPage)
  }

  get hasNext() {
    return this.page < this.pageCount - 1
  }

  get hasPrevious() {
    return this.page > 0
  }

  get pageItems() {
    const pageStart = this.page * this.itemsPerPage
    return this.items.get().slice(pageStart, pageStart + this.itemsPerPage)
  }
}
