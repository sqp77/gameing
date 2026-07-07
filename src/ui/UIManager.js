import { EventEmitter } from '../utils/EventEmitter.js';

const SCREEN_SUFFIXES = ['main-menu', 'level-select', 'settings', 'hud', 'pause', 'victory', 'gameover'];
const ELEMENT_IDS = [
  'loading-screen',
  'screen-main-menu', 'screen-level-select', 'screen-settings', 'screen-hud', 'screen-pause', 'screen-victory', 'screen-gameover',
  'btn-play', 'btn-level-select', 'btn-settings', 'best-score-label',
  'level-grid',
  'setting-volume', 'setting-camera', 'setting-sensitivity', 'setting-shadows',
  'hud-level', 'hud-objective', 'hud-score', 'hud-timer', 'btn-pause', 'hud-speed', 'hud-gear',
  'btn-camera-toggle', 'mobile-controls',
  'parking-progress', 'parking-progress-fill', 'toast-container',
  'btn-resume', 'btn-restart', 'btn-pause-settings', 'btn-quit',
  'score-breakdown', 'victory-total', 'btn-next-level', 'btn-retry', 'btn-victory-menu',
  'gameover-reason', 'btn-gameover-retry', 'btn-gameover-menu',
];

// Binds every DOM id already present in index.html to methods/events. Emits UI intent
// events (EventEmitter) for GameManager to act on rather than importing GameManager
// directly, keeping this a one-way (DOM -> game) + (game -> DOM update) boundary.
export class UIManager extends EventEmitter {
  constructor(saveManager) {
    super();
    this.save = saveManager;
    this._settingsReturnScreen = 'main-menu';
    this.el = {};
    for (const id of ELEMENT_IDS) this.el[id] = document.getElementById(id);
    this._wireButtons();
    this._applySettingsToInputs();
  }

  _wireButtons() {
    this.el['btn-play'].addEventListener('click', () => this.emit('play'));
    this.el['btn-level-select'].addEventListener('click', () => {
      this.populateLevelGrid();
      this.showScreen('level-select');
    });
    this.el['btn-settings'].addEventListener('click', () => {
      this._settingsReturnScreen = 'main-menu';
      this.showScreen('settings');
    });

    for (const btn of document.querySelectorAll('[data-back]')) {
      if (btn.closest('#screen-settings')) {
        btn.addEventListener('click', () => this.showScreen(this._settingsReturnScreen));
      } else {
        btn.addEventListener('click', () => this.showScreen(btn.dataset.back));
      }
    }

    this.el['btn-pause'].addEventListener('click', () => this.emit('pause'));
    this.el['btn-resume'].addEventListener('click', () => this.emit('resume'));
    this.el['btn-restart'].addEventListener('click', () => this.emit('restart'));
    this.el['btn-pause-settings'].addEventListener('click', () => {
      this._settingsReturnScreen = 'pause';
      this.showScreen('settings');
    });
    this.el['btn-quit'].addEventListener('click', () => this.emit('quit'));

    this.el['btn-next-level'].addEventListener('click', () => this.emit('nextLevel'));
    this.el['btn-retry'].addEventListener('click', () => this.emit('restart'));
    this.el['btn-victory-menu'].addEventListener('click', () => this.emit('quit'));

    this.el['btn-gameover-retry'].addEventListener('click', () => this.emit('restart'));
    this.el['btn-gameover-menu'].addEventListener('click', () => this.emit('quit'));

    this.el['btn-camera-toggle'].addEventListener('click', () => this.emit('cameraToggle'));

    this.el['setting-volume'].addEventListener('input', (e) => this.emit('settingsChange', { volume: Number(e.target.value) / 100 }));
    this.el['setting-camera'].addEventListener('change', (e) => this.emit('settingsChange', { camera: e.target.value }));
    this.el['setting-sensitivity'].addEventListener('input', (e) => this.emit('settingsChange', { sensitivity: Number(e.target.value) / 100 }));
    this.el['setting-shadows'].addEventListener('change', (e) => this.emit('settingsChange', { shadows: e.target.checked }));
  }

  _applySettingsToInputs() {
    const s = this.save.getSettings();
    this.el['setting-volume'].value = Math.round(s.volume * 100);
    this.el['setting-camera'].value = s.camera;
    this.el['setting-sensitivity'].value = Math.round(s.sensitivity * 100);
    this.el['setting-shadows'].checked = s.shadows;
    this.el['best-score-label'].textContent = this.save.getOverallBestScore();
  }

  showScreen(name) {
    for (const id of SCREEN_SUFFIXES) {
      const el = this.el[`screen-${id}`];
      if (el) el.classList.toggle('hidden', id !== name);
    }
    if (name === 'main-menu') this.el['best-score-label'].textContent = this.save.getOverallBestScore();
  }

  hideLoading() {
    this.el['loading-screen'].classList.add('hidden');
  }

  showMobileControls(show) {
    this.el['mobile-controls'].classList.toggle('hidden', !show);
  }

  setNextLevelEnabled(enabled) {
    this.el['btn-next-level'].style.display = enabled ? '' : 'none';
  }

  populateLevelGrid(currentLevelId) {
    const grid = this.el['level-grid'];
    grid.innerHTML = '';
    const unlocked = this.save.getUnlockedLevel();
    for (let i = 1; i <= 20; i++) {
      const tile = document.createElement('div');
      const locked = i > unlocked;
      const best = this.save.getBestScore(i);
      const completed = best > 0;
      tile.className =
        'level-tile' + (locked ? ' locked' : '') + (completed ? ' completed' : '') + (i === currentLevelId ? ' current-select' : '');
      const num = document.createElement('div');
      num.textContent = String(i);
      tile.appendChild(num);
      if (completed) {
        const stars = document.createElement('div');
        stars.className = 'stars';
        const starCount = best >= 850 ? 3 : best >= 550 ? 2 : 1;
        stars.textContent = '★'.repeat(starCount) + '☆'.repeat(3 - starCount);
        tile.appendChild(stars);
      }
      if (!locked) tile.addEventListener('click', () => this.emit('selectLevel', i));
      grid.appendChild(tile);
    }
  }

  updateHUD({ level, score, timeRemaining, speedKmh, gear, objective }) {
    this.el['hud-level'].textContent = level;
    this.el['hud-score'].textContent = Math.round(score);
    this.el['hud-objective'].textContent = objective;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    this.el['hud-timer'].textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.el['hud-timer'].classList.toggle('low-time', timeRemaining < 15);
    this.el['hud-speed'].textContent = Math.round(speedKmh);
    this.el['hud-gear'].textContent = gear;
    this.el['hud-gear'].classList.toggle('reverse', gear === 'R');
  }

  showParkingProgress(ratio) {
    this.el['parking-progress'].classList.toggle('hidden', ratio <= 0);
    this.el['parking-progress-fill'].style.width = `${Math.round(ratio * 100)}%`;
  }

  showToast(text, type = 'warn') {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'success' ? ' success' : '');
    toast.textContent = text;
    this.el['toast-container'].appendChild(toast);
    setTimeout(() => toast.remove(), 1650);
  }

  showVictory(breakdown) {
    const el = this.el['score-breakdown'];
    el.innerHTML = '';
    const rows = [
      ['Base', breakdown.base],
      ['Time Bonus', breakdown.timeBonus],
      ['Accuracy Bonus', breakdown.accuracyBonus],
      ['No-Collision Bonus', breakdown.noCollisionBonus],
      ['Penalties', -breakdown.penalties],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${label}</span><span>${value}</span>`;
      el.appendChild(row);
    }
    this.el['victory-total'].textContent = breakdown.total;
    this.showScreen('victory');
  }

  showGameOver(reason) {
    this.el['gameover-reason'].textContent = reason;
    this.showScreen('gameover');
  }
}
