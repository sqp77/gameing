/*
 * ParkMaster3D
 * Owner: Saud
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { VEHICLE_PRESETS } from '../entities/Car.js';
import { LEVEL_COUNT } from '../world/levels.js';

const SCREEN_SUFFIXES = [
  'main-menu', 'level-select', 'achievements', 'settings', 'credits', 'progress', 'shop', 'daily',
  'hud', 'pause', 'victory', 'gameover', 'restart-confirm', 'replay',
];
const ELEMENT_IDS = [
  'loading-screen',
  'screen-main-menu', 'screen-level-select', 'screen-achievements', 'screen-settings', 'screen-credits', 'screen-progress',
  'screen-shop', 'screen-daily',
  'screen-hud', 'screen-pause', 'screen-victory', 'screen-gameover', 'screen-restart-confirm', 'screen-replay',
  'btn-play', 'btn-level-select', 'btn-achievements', 'btn-settings', 'btn-credits', 'btn-progress', 'best-score-label',
  'btn-shop', 'btn-daily', 'shop-grid', 'shop-coins', 'daily-grid',
  'level-grid',
  'achievements-grid', 'achievements-summary',
  'setting-volume', 'setting-camera', 'setting-sensitivity', 'setting-shadows', 'setting-ghost-replay',
  'hud-level', 'hud-objective', 'hud-score', 'hud-timer', 'btn-pause', 'btn-hud-restart', 'hud-speed', 'hud-gear',
  'btn-camera-toggle', 'mobile-controls',
  'parking-progress', 'parking-progress-fill', 'toast-container',
  'radar-widget', 'radar-canvas', 'achievement-popup-container',
  'level-intro-banner', 'level-intro-num',
  'btn-resume', 'btn-restart', 'btn-pause-settings', 'btn-quit',
  'score-breakdown', 'victory-total', 'btn-next-level', 'btn-retry', 'btn-victory-menu', 'btn-watch-replay',
  'gameover-reason', 'btn-gameover-retry', 'btn-gameover-menu',
  'btn-restart-confirm', 'btn-restart-cancel',
  'btn-stop-replay', 'replay-label',
  'menu-overview', 'overview-fill', 'overview-percent', 'overview-stars', 'overview-vehicle', 'overview-coins',
  'progress-stats', 'progress-level-list', 'progress-achievements',
];

const RADAR_RANGE = 18; // meters — must match TrafficManager's WARNING_RADIUS
const RADAR_TYPE_COLORS = { pedestrian: '#ffd166', trafficCar: '#ff5252', cart: '#ffa63d', cone: '#ff6a1a' };
const ACHIEVEMENT_POPUP_MS = 3000;

function starGlyphs(count) {
  return '★'.repeat(count) + '☆'.repeat(3 - count);
}

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Coarser than formatClock — used for lifetime totals that can span hours, not a single run.
function formatPlayTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

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
    this.el['btn-achievements'].addEventListener('click', () => {
      this.populateAchievements();
      this.showScreen('achievements');
    });
    this.el['btn-credits'].addEventListener('click', () => this.showScreen('credits'));
    this.el['btn-progress'].addEventListener('click', () => {
      this.populateProgressScreen();
      this.showScreen('progress');
    });
    this.el['btn-shop'].addEventListener('click', () => {
      this.populateShop();
      this.showScreen('shop');
    });
    this.el['btn-daily'].addEventListener('click', () => {
      this.populateDaily();
      this.showScreen('daily');
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
    this.el['btn-restart'].addEventListener('click', () => this.emit('restartRequest'));
    this.el['btn-hud-restart'].addEventListener('click', () => this.emit('restartRequest'));
    this.el['btn-restart-confirm'].addEventListener('click', () => this.emit('restartConfirmed'));
    this.el['btn-restart-cancel'].addEventListener('click', () => this.emit('restartCancelled'));
    this.el['btn-pause-settings'].addEventListener('click', () => {
      this._settingsReturnScreen = 'pause';
      this.showScreen('settings');
    });
    this.el['btn-quit'].addEventListener('click', () => this.emit('quit'));

    this.el['btn-next-level'].addEventListener('click', () => this.emit('nextLevel'));
    this.el['btn-retry'].addEventListener('click', () => this.emit('restart'));
    this.el['btn-victory-menu'].addEventListener('click', () => this.emit('quit'));
    this.el['btn-watch-replay'].addEventListener('click', () => this.emit('watchReplay'));
    this.el['btn-stop-replay'].addEventListener('click', () => this.emit('stopReplay'));

    this.el['btn-gameover-retry'].addEventListener('click', () => this.emit('restart'));
    this.el['btn-gameover-menu'].addEventListener('click', () => this.emit('quit'));

    this.el['btn-camera-toggle'].addEventListener('click', () => this.emit('cameraToggle'));

    this.el['setting-volume'].addEventListener('input', (e) => this.emit('settingsChange', { volume: Number(e.target.value) / 100 }));
    this.el['setting-camera'].addEventListener('change', (e) => this.emit('settingsChange', { camera: e.target.value }));
    this.el['setting-sensitivity'].addEventListener('input', (e) => this.emit('settingsChange', { sensitivity: Number(e.target.value) / 100 }));
    this.el['setting-shadows'].addEventListener('change', (e) => this.emit('settingsChange', { shadows: e.target.checked }));
    this.el['setting-ghost-replay'].addEventListener('change', (e) => this.emit('settingsChange', { ghostReplay: e.target.checked }));
  }

  _applySettingsToInputs() {
    const s = this.save.getSettings();
    this.el['setting-volume'].value = Math.round(s.volume * 100);
    this.el['setting-camera'].value = s.camera;
    this.el['setting-ghost-replay'].checked = s.ghostReplay;
    this.el['setting-sensitivity'].value = Math.round(s.sensitivity * 100);
    this.el['setting-shadows'].checked = s.shadows;
    this.el['best-score-label'].textContent = this.save.getOverallBestScore();
  }

  showScreen(name) {
    for (const id of SCREEN_SUFFIXES) {
      const el = this.el[`screen-${id}`];
      if (el) el.classList.toggle('hidden', id !== name);
    }
    if (name === 'main-menu') this._refreshMainMenu();
  }

  // Continue label + the Progress Overview panel both reflect save state that can change between
  // menu visits (finishing a level, unlocking a vehicle), so they're recomputed every time the
  // main menu is shown rather than once at startup.
  _refreshMainMenu() {
    this.el['best-score-label'].textContent = this.save.getOverallBestScore();
    const unlocked = this.save.getUnlockedLevel();
    this.el['btn-play'].textContent = unlocked > 1 ? `Continue — Level ${unlocked}` : 'Play';

    const totals = this.save.getTotals();
    this.el['overview-percent'].textContent = `${totals.percentComplete}%`;
    this.el['overview-fill'].style.width = `${totals.percentComplete}%`;
    this.el['overview-stars'].textContent = `${totals.totalStars} / ${totals.maxStars}`;
    const vehicle = VEHICLE_PRESETS.find((p) => p.id === this.save.getSelectedVehicle()) || VEHICLE_PRESETS[0];
    this.el['overview-vehicle'].textContent = vehicle.name;
    this.el['overview-coins'].textContent = this.save.getCoins();
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

  setWatchReplayEnabled(enabled) {
    this.el['btn-watch-replay'].style.display = enabled ? '' : 'none';
  }

  showRestartConfirm() {
    this.showScreen('restart-confirm');
  }

  populateLevelGrid(currentLevelId) {
    const grid = this.el['level-grid'];
    grid.innerHTML = '';
    const unlocked = this.save.getUnlockedLevel();
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const tile = document.createElement('div');
      const locked = i > unlocked;
      const stats = this.save.getLevelStats(i);
      const completed = stats.timesCompleted > 0;
      tile.className =
        'level-tile' + (locked ? ' locked' : '') + (completed ? ' completed' : '') + (i === currentLevelId ? ' current-select' : '');
      const num = document.createElement('div');
      num.textContent = String(i);
      tile.appendChild(num);
      if (completed) {
        const stars = document.createElement('div');
        stars.className = 'stars';
        stars.textContent = starGlyphs(stats.stars);
        tile.appendChild(stars);
      }
      if (!locked) tile.addEventListener('click', () => this.emit('selectLevel', i));
      grid.appendChild(tile);
    }
  }

  populateAchievements() {
    const unlocked = this.save.getAchievements();
    const grid = this.el['achievements-grid'];
    grid.innerHTML = '';
    let unlockedCount = 0;
    for (const def of ACHIEVEMENTS) {
      const isUnlocked = !!unlocked[def.id]?.unlocked;
      if (isUnlocked) unlockedCount++;
      const card = document.createElement('div');
      card.className = 'achievement-card' + (isUnlocked ? ' unlocked' : ' locked');
      card.innerHTML = `
        <div class="achievement-icon">${def.icon}</div>
        <div class="achievement-body">
          <div class="achievement-name">${def.name}</div>
          <div class="achievement-desc">${def.description}</div>
        </div>`;
      grid.appendChild(card);
    }
    const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);
    this.el['achievements-summary'].textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} Unlocked (${pct}%)`;
  }

  // Reuses the achievement-card layout (icon column just omitted) for a vehicle list with a
  // Buy/Use action button per row — same visual language, no new component.
  populateShop() {
    this.el['shop-coins'].textContent = this.save.getCoins();
    const grid = this.el['shop-grid'];
    grid.innerHTML = '';
    const selected = this.save.getSelectedVehicle();
    for (const v of VEHICLE_PRESETS) {
      const unlocked = this.save.isVehicleUnlocked(v.id);
      const isSelected = v.id === selected;
      const card = document.createElement('div');
      card.className = 'achievement-card' + (unlocked ? ' unlocked' : ' locked');
      card.innerHTML = `
        <div class="achievement-body">
          <div class="achievement-name">${v.name}${isSelected ? ' (Selected)' : ''}</div>
          <div class="achievement-desc">${unlocked ? 'Owned' : `${v.cost} coins`}</div>
        </div>`;
      if (!unlocked || !isSelected) {
        const btn = document.createElement('button');
        btn.className = 'btn card-btn';
        btn.textContent = unlocked ? 'Use' : 'Buy';
        btn.addEventListener('click', () => this.emit(unlocked ? 'selectVehicle' : 'buyVehicle', v.id));
        card.appendChild(btn);
      }
      grid.appendChild(card);
    }
  }

  // Compact daily-challenge list: reuses achievement-card's locked/unlocked styling as
  // incomplete/complete (no separate "claim" button — SaveManager auto-awards on completion).
  populateDaily() {
    const grid = this.el['daily-grid'];
    grid.innerHTML = '';
    for (const c of this.save.getDailyChallenges()) {
      const goal = c.type === 'complete' ? c.target : 1;
      const card = document.createElement('div');
      card.className = 'achievement-card' + (c.done ? ' unlocked' : ' locked');
      card.innerHTML = `
        <div class="achievement-body">
          <div class="achievement-name">${c.label}</div>
          <div class="achievement-desc">${c.done ? 'Complete' : `${Math.min(c.progress, goal)} / ${goal}`} · +${c.reward} coins</div>
        </div>`;
      grid.appendChild(card);
    }
  }

  // Full player profile: lifetime stat cards, a per-level record table (score/time/accuracy/
  // collisions/stars sourced from SaveManager.getLevelStats — the same data level select's stars
  // come from), and a recent-achievements strip. Rebuilt each time the screen is opened rather than
  // kept live, since it's only visible from the main menu (never during gameplay).
  populateProgressScreen() {
    const totals = this.save.getTotals();
    const vehicle = VEHICLE_PRESETS.find((p) => p.id === this.save.getSelectedVehicle()) || VEHICLE_PRESETS[0];

    const statCards = [
      ['Current Level', this.save.getLastPlayedLevel()],
      ['Highest Unlocked', this.save.getUnlockedLevel()],
      ['Levels Completed', `${totals.levelsCompleted} / ${LEVEL_COUNT}`],
      ['Total Stars', `${totals.totalStars} / ${totals.maxStars}`],
      ['Completion', `${totals.percentComplete}%`],
      ['Total Play Time', formatPlayTime(totals.playTimeSec)],
      ['Parks Completed', totals.completedParks],
      ['Total Collisions', totals.collisions],
      ['Highest Score', this.save.getOverallBestScore()],
      ['Best Accuracy', totals.bestAccuracy > 0 ? `${Math.round(totals.bestAccuracy * 100)}%` : '—'],
      ['Coins', this.save.getCoins()],
      ['Coins Earned', totals.coinsEarned],
      ['Current Vehicle', vehicle.name],
    ];
    const statsEl = this.el['progress-stats'];
    statsEl.innerHTML = '';
    for (const [label, value] of statCards) {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
      statsEl.appendChild(card);
    }

    const listEl = this.el['progress-level-list'];
    listEl.innerHTML = '';
    const unlocked = this.save.getUnlockedLevel();
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const locked = i > unlocked;
      const stats = this.save.getLevelStats(i);
      const row = document.createElement('div');
      row.className = 'progress-row' + (locked ? ' locked' : '');
      if (locked) {
        row.innerHTML = `<span class="progress-row-level">Level ${i}</span><span class="progress-row-locked">Locked</span>`;
      } else {
        const completed = stats.timesCompleted > 0;
        row.innerHTML = `
          <span class="progress-row-level">Level ${i}</span>
          <span class="progress-row-stars">${completed ? starGlyphs(stats.stars) : '—'}</span>
          <span class="progress-row-stat"><label>Best Score</label>${completed ? stats.bestScore : '—'}</span>
          <span class="progress-row-stat"><label>Best Time</label>${stats.bestTimeSec != null ? formatClock(stats.bestTimeSec) : '—'}</span>
          <span class="progress-row-stat"><label>Accuracy</label>${stats.bestAccuracy != null ? Math.round(stats.bestAccuracy * 100) + '%' : '—'}</span>
          <span class="progress-row-stat"><label>Collisions</label>${stats.lowestCollisions != null ? stats.lowestCollisions : '—'}</span>`;
      }
      listEl.appendChild(row);
    }

    const recentEl = this.el['progress-achievements'];
    recentEl.innerHTML = '';
    const recentIds = this.save.getRecentAchievements(3);
    if (recentIds.length === 0) {
      recentEl.innerHTML = '<div class="progress-empty">No achievements unlocked yet</div>';
    } else {
      for (const id of recentIds) {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (!def) continue;
        const card = document.createElement('div');
        card.className = 'achievement-card unlocked';
        card.innerHTML = `
          <div class="achievement-icon">${def.icon}</div>
          <div class="achievement-body">
            <div class="achievement-name">${def.name}</div>
            <div class="achievement-desc">${def.description}</div>
          </div>`;
        recentEl.appendChild(card);
      }
    }
  }

  // Queues unlock banners so simultaneous unlocks (e.g. Combo Master alongside the achievements
  // that triggered it) display one after another instead of overlapping.
  queueAchievementPopup(def) {
    this._popupQueue = this._popupQueue || [];
    this._popupQueue.push(def);
    if (!this._popupShowing) this._showNextAchievementPopup();
  }

  _showNextAchievementPopup() {
    const def = this._popupQueue.shift();
    if (!def) {
      this._popupShowing = false;
      return;
    }
    this._popupShowing = true;
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
      <div class="achievement-popup-icon">${def.icon}</div>
      <div class="achievement-popup-text">
        <div class="achievement-popup-title">Achievement Unlocked</div>
        <div class="achievement-popup-name">${def.name}</div>
        <div class="achievement-popup-desc">${def.description}</div>
      </div>`;
    this.el['achievement-popup-container'].appendChild(popup);
    setTimeout(() => {
      popup.remove();
      this._showNextAchievementPopup();
    }, ACHIEVEMENT_POPUP_MS);
  }

  // Draws nearby dynamic-traffic blips relative to the car's own heading (car fixed at radar
  // center, always pointing "up") — cheap 2D canvas draw, no screen-space projection needed.
  // Forward/lateral decomposition matches the convention already used in CarController.js.
  updateRadar(carState, agents) {
    this.el['radar-widget'].classList.toggle('hidden', agents.length === 0);
    if (agents.length === 0) return;
    if (!this._radarCtx) this._radarCtx = this.el['radar-canvas'].getContext('2d');
    const ctx = this._radarCtx;
    const size = this.el['radar-canvas'].width;
    const center = size / 2;
    const scale = (center - 8) / RADAR_RANGE;
    const fx = Math.cos(carState.yaw);
    const fz = Math.sin(carState.yaw);
    const lx = -Math.sin(carState.yaw);
    const lz = Math.cos(carState.yaw);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(0,229,255,0.9)';
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();

    for (const agent of agents) {
      const dx = agent.x - carState.x;
      const dz = agent.z - carState.z;
      const forwardComp = dx * fx + dz * fz;
      const lateralComp = dx * lx + dz * lz;
      const px = center + lateralComp * scale;
      const py = center - forwardComp * scale;
      ctx.fillStyle = RADAR_TYPE_COLORS[agent.type] || '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
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

  // Brief non-blocking banner shown when a level starts — fades out on its own via CSS animation.
  showLevelIntro(levelNum) {
    this.el['level-intro-num'].textContent = levelNum;
    const banner = this.el['level-intro-banner'];
    banner.classList.remove('show');
    // Force reflow so re-triggering the animation works on consecutive same-level starts (retry).
    void banner.offsetWidth;
    banner.classList.add('show');
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
      ['Coins Earned', `+${breakdown.coins}`],
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
