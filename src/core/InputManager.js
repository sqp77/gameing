// Centralizes keyboard + on-screen touch input into a single polled state object.
// Systems read `input.state` each frame rather than attaching their own listeners.
export class InputManager {
  constructor() {
    this.state = {
      throttle: 0, // 0..1
      brake: 0, // 0..1
      steer: 0, // -1..1 (left..right)
      handbrake: false,
      cameraToggle: false, // edge-triggered, consumed by CameraController
      pauseToggle: false,
    };

    this._keys = new Set();
    this._cameraKeyLatch = false;
    this._pauseKeyLatch = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this._setupTouchControls();
  }

  _onKeyDown(e) {
    this._keys.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  }

  _onKeyUp(e) {
    this._keys.delete(e.code);
  }

  _setupTouchControls() {
    const bind = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => {
        e.preventDefault();
        el.classList.add('active');
        onDown();
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('active');
        onUp();
      };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };

    bind('ctrl-accel', () => (this._touchThrottle = 1), () => (this._touchThrottle = 0));
    bind('ctrl-brake', () => (this._touchBrake = 1), () => (this._touchBrake = 0));
    bind('ctrl-left', () => (this._touchSteer = -1), () => (this._touchSteer = this._touchSteer === -1 ? 0 : this._touchSteer));
    bind('ctrl-right', () => (this._touchSteer = 1), () => (this._touchSteer = this._touchSteer === 1 ? 0 : this._touchSteer));
    bind(
      'btn-handbrake',
      () => (this._touchHandbrake = true),
      () => (this._touchHandbrake = false)
    );

    const camBtn = document.getElementById('btn-camera-toggle');
    camBtn?.addEventListener('click', () => (this._touchCameraToggle = true));

    this._touchThrottle = 0;
    this._touchBrake = 0;
    this._touchSteer = 0;
    this._touchHandbrake = false;
    this._touchCameraToggle = false;
  }

  isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  update() {
    const k = this._keys;
    const throttleKey = k.has('KeyW') || k.has('ArrowUp') ? 1 : 0;
    const brakeKey = k.has('KeyS') || k.has('ArrowDown') ? 1 : 0;
    const leftKey = k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0;
    const rightKey = k.has('KeyD') || k.has('ArrowRight') ? 1 : 0;

    this.state.throttle = Math.max(throttleKey, this._touchThrottle);
    this.state.brake = Math.max(brakeKey, this._touchBrake);
    this.state.steer = Math.max(-1, Math.min(1, rightKey - leftKey + this._touchSteer));
    this.state.handbrake = k.has('Space') || this._touchHandbrake;

    const cameraKeyDown = k.has('KeyC');
    if ((cameraKeyDown && !this._cameraKeyLatch) || this._touchCameraToggle) {
      this.state.cameraToggle = true;
    } else {
      this.state.cameraToggle = false;
    }
    this._cameraKeyLatch = cameraKeyDown;
    this._touchCameraToggle = false;

    const pauseKeyDown = k.has('Escape') || k.has('KeyP');
    this.state.pauseToggle = pauseKeyDown && !this._pauseKeyLatch;
    this._pauseKeyLatch = pauseKeyDown;
  }
}
