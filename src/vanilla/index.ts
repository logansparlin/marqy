import {
  type MarqyDirection,
  calcReps,
  calcAnimationDuration,
  createResizeObserver,
} from '../core'

export type { MarqyDirection }

const CLONES = 2

export class MarqyElement extends HTMLElement {
  static observedAttributes = ['speed', 'direction', 'pause-on-hover', 'manual', 'adapt-to-content']

  private _cleanupContainer: (() => void) | null = null
  private _cleanupItem: (() => void) | null = null
  private _containerDims = { width: 0, height: 0 }
  private _itemDims = { width: 0, height: 0 }
  private _reps = 1
  private _inner: HTMLElement | null = null
  private _slotHTML = ''

  private get _speed() {
    return parseFloat(this.getAttribute('speed') ?? '0.5')
  }

  private get _direction(): MarqyDirection {
    return (this.getAttribute('direction') as MarqyDirection) ?? 'left'
  }

  private get _pauseOnHover() {
    return this.hasAttribute('pause-on-hover')
  }

  private get _manual() {
    return this.hasAttribute('manual')
  }

  private get _adaptToContent() {
    return this.hasAttribute('adapt-to-content')
  }

  private get _isVertical() {
    return this._direction === 'up' || this._direction === 'down'
  }

  connectedCallback() {
    this._slotHTML = this.innerHTML
    this._render()
    this._observeResize()
  }

  disconnectedCallback() {
    this._cleanup()
  }

  attributeChangedCallback() {
    if (this._inner) this._update()
  }

  private _setHostAttrs() {
    this.setAttribute('data-direction', this._direction)
    if (this._pauseOnHover) {
      this.setAttribute('data-pause-on-hover', '')
    } else {
      this.removeAttribute('data-pause-on-hover')
    }
    if (this._adaptToContent) {
      this.setAttribute('data-adapt-to-content', '')
    } else {
      this.removeAttribute('data-adapt-to-content')
    }
  }

  private _render() {
    this.setAttribute('data-marqy', '')
    this._setHostAttrs()

    this._inner = document.createElement('div')
    this._inner.setAttribute('data-marqy-inner', '')

    this.innerHTML = ''
    this.appendChild(this._inner)
    this._buildStructure()
  }

  private _buildStructure() {
    if (!this._inner) return
    this._inner.innerHTML = ''

    if (this._adaptToContent && this._reps > 1) {
      const content = document.createElement('div')
      content.setAttribute('data-marqy-content', '')
      const item = document.createElement('div')
      item.setAttribute('data-marqy-item', '')
      item.innerHTML = this._slotHTML
      content.appendChild(item)
      this._inner.appendChild(content)
    } else {
      for (let clone = 0; clone < CLONES; clone++) {
        const content = document.createElement('div')
        content.setAttribute('data-marqy-content', '')
        for (let rep = 0; rep < this._reps; rep++) {
          const item = document.createElement('div')
          item.setAttribute('data-marqy-item', '')
          if (clone !== 0 || rep !== 0) item.setAttribute('aria-hidden', 'true')
          item.innerHTML = this._slotHTML
          content.appendChild(item)
        }
        this._inner.appendChild(content)
      }
    }

    this._applyDuration()
  }

  private _observeResize() {
    this._cleanupContainer?.()
    this._cleanupContainer = createResizeObserver(this, (d) => {
      this._containerDims = d
      this._recalc()
    })

    const firstItem = this.querySelector<HTMLElement>('[data-marqy-item]')
    if (firstItem) {
      this._cleanupItem?.()
      this._cleanupItem = createResizeObserver(firstItem, (d) => {
        this._itemDims = d
        this._recalc()
      })
    }
  }

  private _recalc() {
    const cSize = this._isVertical ? this._containerDims.height : this._containerDims.width
    const iSize = this._isVertical ? this._itemDims.height : this._itemDims.width
    const newReps = calcReps(cSize, iSize)
    if (newReps !== this._reps) {
      this._reps = newReps
      this._buildStructure()
      this._reObserveItem()
    } else {
      this._applyDuration()
    }
  }

  private _reObserveItem() {
    this._cleanupItem?.()
    const firstItem = this.querySelector<HTMLElement>('[data-marqy-item]')
    if (firstItem) {
      this._cleanupItem = createResizeObserver(firstItem, (d) => {
        this._itemDims = d
        this._recalc()
      })
    }
  }

  private _applyDuration() {
    if (!this._inner) return
    if (this._adaptToContent && this._reps > 1) return
    const duration = calcAnimationDuration(
      this._isVertical ? this._itemDims.height : this._itemDims.width,
      this._reps,
      this._speed
    )
    const contents = this._inner.querySelectorAll<HTMLElement>('[data-marqy-content]')
    contents.forEach((content) => {
      if (this._manual) {
        content.setAttribute('data-marqy-static', duration)
        content.style.animationDuration = ''
      } else {
        content.removeAttribute('data-marqy-static')
        content.style.animationDuration = duration
      }
    })
  }

  private _update() {
    this._setHostAttrs()
    this._buildStructure()
    this._reObserveItem()
  }

  private _cleanup() {
    this._cleanupContainer?.()
    this._cleanupItem?.()
    this._cleanupContainer = null
    this._cleanupItem = null
  }
}

if (!customElements.get('marqy-loop')) {
  customElements.define('marqy-loop', MarqyElement)
}

export { MarqyElement as Marqy }
