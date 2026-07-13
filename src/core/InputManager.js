// Handles keyboard arrows + touch swipe/tap input and reports lane-change intents.

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.onLeft = null;
    this.onRight = null;

    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchActive = false;
    this._swipeThreshold = 40;

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);

    target.addEventListener('keydown', this._handleKeyDown);
    target.addEventListener('touchstart', this._handleTouchStart, { passive: true });
    target.addEventListener('touchend', this._handleTouchEnd, { passive: true });
  }

  _handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this._emitLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this._emitRight();
    }
  }

  _handleTouchStart(e) {
    const t = e.changedTouches[0];
    this._touchStartX = t.clientX;
    this._touchStartY = t.clientY;
    this._touchActive = true;
  }

  _handleTouchEnd(e) {
    if (!this._touchActive) return;
    this._touchActive = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStartX;
    const dy = t.clientY - this._touchStartY;
    if (Math.abs(dx) < this._swipeThreshold || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) this._emitLeft();
    else this._emitRight();
  }

  // In RTL screen-space swipe left/right maps directly to world left/right (screen-space, not text direction).
  _emitLeft() {
    if (this.onLeft) this.onLeft();
  }

  _emitRight() {
    if (this.onRight) this.onRight();
  }

  dispose() {
    this.target.removeEventListener('keydown', this._handleKeyDown);
    this.target.removeEventListener('touchstart', this._handleTouchStart);
    this.target.removeEventListener('touchend', this._handleTouchEnd);
  }
}
