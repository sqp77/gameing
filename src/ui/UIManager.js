/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { VEHICLE_PRESETS } from '../entities/Car.js';
import { LEVEL_COUNT, getLevelConfig } from '../world/levels.js';
import { PARKING_TYPE_LABELS, PARKING_TYPE_GLYPHS } from '../data/parkingTypes.js';
import { ratingLabelForValue } from '../utils/scoring.js';
import { PROVIDER_LABELS } from '../core/AuthManager.js';
import { ACADEMY_MODULES } from '../data/academyLevels.js';
import { LICENSE_ROUTES, LICENSE_TIER_IDS } from '../data/licenseRoutes.js';
import { getActiveEvent } from '../systems/EventManager.js';
import { JOB_TYPES } from '../data/jobs.js';
import { rankProgress } from '../utils/reputation.js';

const SCREEN_SUFFIXES = [
  'auth', 'main-menu', 'level-select', 'achievements', 'settings', 'credits', 'progress', 'shop', 'daily', 'profile',
  'academy', 'academy-certificate', 'license-select', 'license-result',
  'hud', 'pause', 'victory', 'gameover', 'restart-confirm', 'replay',
];
const ELEMENT_IDS = [
  'loading-screen',
  'screen-auth', 'screen-main-menu', 'screen-level-select', 'screen-achievements', 'screen-settings', 'screen-credits', 'screen-progress',
  'screen-shop', 'screen-daily', 'screen-profile',
  'screen-academy', 'screen-academy-certificate', 'screen-license-select', 'screen-license-result',
  'screen-hud', 'screen-pause', 'screen-victory', 'screen-gameover', 'screen-restart-confirm', 'screen-replay',
  'btn-play', 'btn-level-select', 'btn-achievements', 'btn-settings', 'btn-credits', 'btn-progress', 'best-score-label',
  'btn-shop', 'btn-daily', 'shop-grid', 'shop-coins', 'daily-grid',
  'btn-academy', 'btn-license-test', 'academy-grid', 'license-grid',
  'academy-certificate-canvas-wrap', 'btn-save-academy-certificate', 'btn-academy-certificate-back',
  'license-result-title', 'license-result-stats', 'license-certificate-canvas-wrap',
  'btn-save-license-certificate', 'btn-license-retry', 'btn-license-menu',
  'auth-welcome', 'auth-account-list', 'auth-provider-list', 'auth-form', 'auth-name', 'auth-email',
  'auth-confirm', 'auth-cancel', 'btn-auth-skip',
  'account-bar', 'account-avatar', 'account-welcome', 'account-substats',
  'btn-profile', 'btn-sign-in', 'btn-menu-logout',
  'profile-avatar', 'profile-name', 'profile-provider', 'profile-email', 'profile-created', 'profile-license-badge',
  'btn-switch-account', 'btn-logout',
  'btn-export-save', 'btn-import-save', 'input-import-save',
  'level-grid',
  'achievements-grid', 'achievements-summary',
  'setting-volume', 'setting-camera', 'setting-sensitivity', 'setting-shadows', 'setting-ghost-replay', 'setting-assist',
  'setting-language', 'setting-events',
  'hud-level', 'hud-objective', 'hud-score', 'hud-timer', 'btn-pause', 'btn-hud-restart', 'hud-speed', 'hud-gear',
  'btn-camera-toggle', 'mobile-controls',
  'parking-progress', 'parking-progress-fill', 'toast-container',
  'radar-widget', 'radar-canvas', 'achievement-popup-container',
  'assist-widget', 'assist-front-fill', 'assist-rear-fill',
  'level-intro-banner', 'level-intro-num', 'level-intro-type',
  'btn-resume', 'btn-restart', 'btn-pause-settings', 'btn-quit',
  'score-breakdown', 'victory-total', 'victory-rating', 'rating-fill', 'rating-percent',
  'btn-next-level', 'btn-retry', 'btn-victory-menu', 'btn-watch-replay',
  'gameover-reason', 'btn-gameover-retry', 'btn-gameover-menu',
  'btn-restart-confirm', 'btn-restart-cancel',
  'btn-stop-replay', 'replay-label',
  'progress-stats', 'progress-level-list', 'progress-achievements',
  'btn-enter-hub', 'hud-rank-badge',
  'hub-job-offer', 'hub-job-offer-title', 'hub-job-offer-desc', 'hub-job-offer-reward', 'btn-job-accept', 'btn-job-decline',
  'btn-exit', 'menu-rank-badge',
  'btn-quick-resume', 'qa-last-mode', 'qa-city', 'qa-vehicle', 'qa-achievement', 'qa-rank',
  'pc-levels-fill', 'pc-levels-value', 'pc-academy-fill', 'pc-academy-value',
  'pc-license-fill', 'pc-license-value', 'pc-reputation-fill', 'pc-reputation-value',
  'pc-vehicles-fill', 'pc-vehicles-value', 'pc-coins',
  'setting-search', 'settings-empty',
];

// Screens reachable both from the main menu and by driving to their hub landmark
// (Feature 1) — their [data-back] button routes through GameManager (`backFromHubOrMenu`)
// instead of navigating directly, so "Back" can return to the hub when that's where the
// player came from.
const HUB_ORIGIN_SCREENS = new Set(['academy', 'license-select', 'shop']);

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

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

// Binds every DOM id already present in index.html to methods/events. Emits UI intent
// events (EventEmitter) for GameManager to act on rather than importing GameManager
// directly, keeping this a one-way (DOM -> game) + (game -> DOM update) boundary.
export class UIManager extends EventEmitter {
  constructor(saveManager, authManager, i18n) {
    super();
    this.save = saveManager;
    this.auth = authManager;
    this.i18n = i18n;
    this._settingsReturnScreen = 'main-menu';
    this._pendingAuthProvider = null;
    this._activeScreen = 'auth';
    this.el = {};
    for (const id of ELEMENT_IDS) this.el[id] = document.getElementById(id);
    this._wireButtons();
    this._applySettingsToInputs();
  }

  // Shorthand used throughout this file's JS-built (non data-i18n) strings.
  t(key, ...args) {
    return this.i18n.t(key, ...args);
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
    this.el['btn-academy'].addEventListener('click', () => this.showScreen('academy'));
    this.el['btn-license-test'].addEventListener('click', () => this.showScreen('license-select'));
    this.el['btn-enter-hub'].addEventListener('click', () => this.emit('enterHub'));
    this.el['btn-exit'].addEventListener('click', () => this._attemptExit());
    this.el['btn-quick-resume'].addEventListener('click', () => this._resumeLastPlayed());
    for (const btn of document.querySelectorAll('[data-back]')) {
      if (btn.closest('#screen-settings')) {
        btn.addEventListener('click', () => this.showScreen(this._settingsReturnScreen));
      } else {
        btn.addEventListener('click', () => {
          if (HUB_ORIGIN_SCREENS.has(this._activeScreen)) this.emit('backFromHubOrMenu', btn.dataset.back);
          else this.showScreen(btn.dataset.back);
        });
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
    this.el['setting-assist'].addEventListener('change', (e) => this.emit('settingsChange', { assist: e.target.checked }));
    this.el['setting-language'].addEventListener('change', (e) => this.emit('settingsChange', { language: e.target.value }));
    this.el['setting-events'].addEventListener('change', (e) => this.emit('settingsChange', { eventsEnabled: e.target.checked }));
    this.el['setting-search'].addEventListener('input', (e) => this._filterSettings(e.target.value));

    // ----- Auth screen -----
    for (const btn of document.querySelectorAll('.auth-provider-btn')) {
      btn.addEventListener('click', () => this._openAuthForm(btn.dataset.provider));
    }
    this.el['auth-confirm'].addEventListener('click', () => this._submitAuthForm());
    this.el['auth-cancel'].addEventListener('click', () => this._closeAuthForm());
    this.el['btn-auth-skip'].addEventListener('click', () => this.showScreen('main-menu'));

    // ----- Account bar / profile -----
    this.el['btn-profile'].addEventListener('click', () => this.showScreen('profile'));
    this.el['btn-sign-in'].addEventListener('click', () => this.showScreen('auth'));
    this.el['btn-menu-logout'].addEventListener('click', () => this.emit('logout'));
    this.el['btn-logout'].addEventListener('click', () => this.emit('logout'));
    this.el['btn-switch-account'].addEventListener('click', () => this.showScreen('auth'));

    // ----- Save export/import (manual cross-device transfer, see SaveManager.exportSnapshot) -----
    this.el['btn-export-save'].addEventListener('click', () => this._exportSave());
    this.el['btn-import-save'].addEventListener('click', () => this.el['input-import-save'].click());
    this.el['input-import-save'].addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.emit('importSaveFile', file);
      e.target.value = '';
    });

    // ----- Academy certificate / License result -----
    this.el['btn-academy-certificate-back'].addEventListener('click', () => this.emit('quitToAcademy'));
    this.el['btn-save-academy-certificate'].addEventListener('click', () => this._downloadCanvas(this._lastCertificateCanvas, 'masar-academy-certificate.png'));
    this.el['btn-save-license-certificate'].addEventListener('click', () => this._downloadCanvas(this._lastCertificateCanvas, 'masar-driving-license.png'));
    this.el['btn-license-retry'].addEventListener('click', () => this.emit('restart'));
    this.el['btn-license-menu'].addEventListener('click', () => this.emit('quit'));

    // ----- Open World Hub: job offer prompt -----
    this.el['btn-job-accept'].addEventListener('click', () => this.emit('jobAccept'));
    this.el['btn-job-decline'].addEventListener('click', () => this.emit('jobDecline'));
  }

  _openAuthForm(provider) {
    this._pendingAuthProvider = provider;
    this.el['auth-name'].value = '';
    this.el['auth-email'].value = '';
    this.el['auth-form'].classList.remove('hidden');
    this.el['auth-provider-list'].classList.add('hidden');
    this.el['auth-name'].focus();
  }

  _closeAuthForm() {
    this._pendingAuthProvider = null;
    this.el['auth-form'].classList.add('hidden');
    this.el['auth-provider-list'].classList.remove('hidden');
  }

  _submitAuthForm() {
    const name = this.el['auth-name'].value.trim();
    if (!name) {
      this.el['auth-name'].focus();
      return;
    }
    this.emit('authProviderLogin', { provider: this._pendingAuthProvider, name, email: this.el['auth-email'].value.trim() });
    this._closeAuthForm();
  }

  _exportSave() {
    const blob = new Blob([this.save.exportSnapshot()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'masar-save.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Renders the "continue as" list of local profiles already on this device (avatar/name/
  // provider badge + a small remove control) above the four provider buttons used to add a new
  // one. Reused every time the auth screen is shown so a fresh signup/removal is reflected.
  populateAuthScreen() {
    const accounts = this.auth.getAccounts();
    const list = this.el['auth-account-list'];
    list.innerHTML = '';
    list.classList.toggle('hidden', accounts.length === 0);
    for (const acct of accounts) {
      const tile = document.createElement('div');
      tile.className = 'auth-account-tile';
      tile.innerHTML = `
        <div class="auth-avatar" style="background:hsl(${acct.avatarHue},65%,42%)">${(acct.name[0] || '?').toUpperCase()}</div>
        <div class="auth-account-info">
          <div class="auth-account-name">${acct.name}</div>
          <div class="auth-account-provider">${PROVIDER_LABELS[acct.provider] || acct.provider}</div>
        </div>
        <button class="auth-account-remove" title="${this.t('auth.remove')}">&times;</button>`;
      tile.addEventListener('click', (e) => {
        if (e.target.closest('.auth-account-remove')) return;
        this.emit('authSelectAccount', acct.id);
      });
      tile.querySelector('.auth-account-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.emit('authRemoveAccount', acct.id);
      });
      list.appendChild(tile);
    }
    this._closeAuthForm();
    this.el['auth-welcome'].textContent = this.t(accounts.length > 0 ? 'auth.welcomeReturning' : 'auth.welcomeDefault');
  }

  populateProfile() {
    const acct = this.auth.getActiveAccount();
    if (!acct) return; // guests can't reach this screen (button hidden), but stay safe
    this.el['profile-avatar'].style.background = `hsl(${acct.avatarHue},65%,42%)`;
    this.el['profile-avatar'].textContent = (acct.name[0] || '?').toUpperCase();
    this.el['profile-name'].textContent = acct.name;
    this.el['profile-provider'].textContent = PROVIDER_LABELS[acct.provider] || acct.provider;
    this.el['profile-email'].textContent = acct.email || this.t('profile.notProvided');
    this.el['profile-created'].textContent = new Date(acct.createdAt).toLocaleDateString();
    const license = this.save.getLicenseStatus();
    this.el['profile-license-badge'].textContent = this.t(license.earned ? 'profile.licensed' : 'profile.notLicensed');
    this.el['profile-license-badge'].classList.toggle('earned', license.earned);
  }

  // Shows/hides the main-menu account bar and Profile/Logout/Sign-In buttons based on login
  // state, and fills in the avatar/name/coins/level/stars line when logged in.
  _updateAccountBar() {
    const acct = this.auth.getActiveAccount();
    this.el['account-bar'].classList.toggle('hidden', !acct);
    this.el['btn-profile'].classList.toggle('hidden', !acct);
    this.el['btn-menu-logout'].classList.toggle('hidden', !acct);
    this.el['btn-sign-in'].classList.toggle('hidden', !!acct);
    if (!acct) return;
    this.el['account-avatar'].style.background = `hsl(${acct.avatarHue},65%,42%)`;
    this.el['account-avatar'].textContent = (acct.name[0] || '?').toUpperCase();
    this.el['account-welcome'].textContent = `${this.t('account.welcomePrefix')}${acct.name}`;
    const totals = this.save.getTotals();
    this.el['account-substats'].textContent =
      `${this.save.getCoins()}${this.t('common.coinsSuffix')} · ${this.t('hud.level')} ${this.save.getUnlockedLevel()} · ${totals.totalStars}★`;
  }

  _applySettingsToInputs() {
    const s = this.save.getSettings();
    this.el['setting-volume'].value = Math.round(s.volume * 100);
    this.el['setting-camera'].value = s.camera;
    this.el['setting-ghost-replay'].checked = s.ghostReplay;
    this.el['setting-assist'].checked = s.assist;
    this.el['setting-sensitivity'].value = Math.round(s.sensitivity * 100);
    this.el['setting-shadows'].checked = s.shadows;
    this.el['setting-language'].value = s.language;
    this.el['setting-events'].checked = s.eventsEnabled;
    this.el['best-score-label'].textContent = this.save.getOverallBestScore();
  }

  showScreen(name) {
    this._activeScreen = name;
    for (const id of SCREEN_SUFFIXES) {
      const el = this.el[`screen-${id}`];
      if (el) el.classList.toggle('hidden', id !== name);
    }
    if (name === 'main-menu') this._refreshMainMenu();
    if (name === 'auth') this.populateAuthScreen();
    if (name === 'profile') this.populateProfile();
    if (name === 'academy') this.populateAcademy();
    if (name === 'license-select') this.populateLicenseSelect();
  }

  // Re-renders whatever's on screen in the new language — called once by GameManager whenever
  // I18n#setLanguage fires its 'change' event. Static text is handled by I18n#apply's data-i18n
  // sweep (already run by the caller); this only needs to re-run the small set of screens built
  // from JS template strings, i.e. skip anything that has no populate/refresh step of its own.
  onLanguageChange() {
    const refreshers = {
      'main-menu': () => this._refreshMainMenu(),
      'level-select': () => this.populateLevelGrid(),
      achievements: () => this.populateAchievements(),
      shop: () => this.populateShop(),
      daily: () => this.populateDaily(),
      progress: () => this.populateProgressScreen(),
      academy: () => this.populateAcademy(),
      'license-select': () => this.populateLicenseSelect(),
      auth: () => this.populateAuthScreen(),
      profile: () => this.populateProfile(),
    };
    refreshers[this._activeScreen]?.();
  }

  // Continue label + the profile/quick-access/progress panels all reflect save state that can
  // change between menu visits (finishing a level, unlocking a vehicle), so they're recomputed
  // every time the main menu is shown rather than once at startup.
  _refreshMainMenu() {
    this.el['best-score-label'].textContent = this.save.getOverallBestScore();
    const unlocked = this.save.getUnlockedLevel();
    const playLabel = this.el['btn-play'].querySelector('.btn-label');
    if (playLabel) playLabel.textContent = unlocked > 1 ? `${this.t('menu.continuePrefix')}${unlocked}` : this.t('menu.play');

    this.el['menu-rank-badge'].textContent = this.t(this.save.getReputation().rank.label);
    this._updateAccountBar();
    this.populateProgressCard();
    this.populateQuickAccess();
  }

  // Player Progress Card (main menu): reuses the same .overview-bar/.overview-fill bar visual
  // as the pre-redesign single completion bar, one row per metric, plus a plain coin stat.
  populateProgressCard() {
    const totals = this.save.getTotals();
    this.el['pc-levels-fill'].style.width = `${totals.percentComplete}%`;
    this.el['pc-levels-value'].textContent = `${totals.levelsCompleted} / ${LEVEL_COUNT} · ${totals.totalStars}★`;

    const certifiedCount = ACADEMY_MODULES.filter((m) => this.save.getAcademyModuleState(m.id).certified).length;
    const academyPct = ACADEMY_MODULES.length ? Math.round((certifiedCount / ACADEMY_MODULES.length) * 100) : 0;
    this.el['pc-academy-fill'].style.width = `${academyPct}%`;
    this.el['pc-academy-value'].textContent = `${academyPct}%`;

    const tierCount = this.save.getEarnedLicenseTierCount();
    const tierTotal = LICENSE_TIER_IDS.length;
    this.el['pc-license-fill'].style.width = `${Math.round((tierCount / tierTotal) * 100)}%`;
    this.el['pc-license-value'].textContent = `${tierCount} / ${tierTotal}`;

    const reputation = this.save.getReputation();
    this.el['pc-reputation-fill'].style.width = `${Math.round(rankProgress(reputation.score) * 100)}%`;
    this.el['pc-reputation-value'].textContent = `${reputation.score} — ${this.t(reputation.rank.label)}`;

    const vehicleCount = this.save.getVehicleCount();
    const vehicleTotal = VEHICLE_PRESETS.length;
    this.el['pc-vehicles-fill'].style.width = `${Math.round((vehicleCount / vehicleTotal) * 100)}%`;
    this.el['pc-vehicles-value'].textContent = `${vehicleCount} / ${vehicleTotal}`;

    this.el['pc-coins'].textContent = this.save.getCoins();
  }

  // Quick Access card: last mode played / city / vehicle / latest achievement / rank, with the
  // whole card acting as a one-click resume button (wired in _wireButtons to whatever action the
  // corresponding primary menu button already performs — no new gameplay entry points).
  populateQuickAccess() {
    const lastPlayed = this.save.getLastPlayed();
    const modeLabels = { campaign: this.t('menu.play'), academy: this.t('menu.academy'), license: this.t('menu.licenseTest'), hub: this.t('menu.openWorld') };
    this.el['qa-last-mode'].textContent = lastPlayed.mode ? modeLabels[lastPlayed.mode] || lastPlayed.mode : this.t('menu.quickAccess.noneYet');
    this.el['qa-city'].textContent = lastPlayed.cityLabel || '—';

    const vehicle = VEHICLE_PRESETS.find((p) => p.id === this.save.getSelectedVehicle()) || VEHICLE_PRESETS[0];
    this.el['qa-vehicle'].textContent = this.t(vehicle.name);

    const recentIds = this.save.getRecentAchievements(1);
    const def = recentIds.length ? ACHIEVEMENTS.find((a) => a.id === recentIds[0]) : null;
    this.el['qa-achievement'].textContent = def ? this.t(def.name) : this.t('menu.quickAccess.noneYet');

    this.el['qa-rank'].textContent = this.t(this.save.getReputation().rank.label);
  }

  // One-click resume (Quick Access card): dispatches to whichever existing action the
  // corresponding primary menu button already performs — never a new gameplay entry point.
  // 'campaign'/no-history both resume via the same Continue action.
  _resumeLastPlayed() {
    const mode = this.save.getLastPlayed().mode;
    if (mode === 'academy') this.showScreen('academy');
    else if (mode === 'license') this.showScreen('license-select');
    else if (mode === 'hub') this.emit('enterHub');
    else this.emit('play');
  }

  // Web builds can't truly quit — closing a tab a script didn't open is blocked by every
  // browser. `window.close()` only succeeds for windows opened via script/window.open, so this
  // is a best-effort attempt with an honest fallback message rather than a silent no-op.
  _attemptExit() {
    window.close();
    setTimeout(() => {
      if (!document.hidden) this.showToast(this.t('toast.exitHint'), 'warn');
    }, 200);
  }

  // Lightweight settings search (Feature: Settings Improvement) — pure substring match over
  // each row's label text, no dependency. Hides a whole group when every row inside it is
  // filtered out, and shows a "no results" message when the entire screen is empty.
  _filterSettings(query) {
    const q = query.trim().toLowerCase();
    let anyVisible = false;
    for (const group of document.querySelectorAll('#screen-settings .settings-group')) {
      let groupHasVisible = false;
      for (const row of group.querySelectorAll('.settings-row')) {
        const label = row.querySelector('label')?.textContent.toLowerCase() || '';
        const match = !q || label.includes(q);
        row.classList.toggle('hidden', !match);
        if (match) groupHasVisible = true;
      }
      group.classList.toggle('hidden', !groupHasVisible);
      if (groupHasVisible) anyVisible = true;
    }
    this.el['settings-empty'].classList.toggle('hidden', anyVisible);
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
      const parkingType = getLevelConfig(i).parkingType;
      const typeBadge = document.createElement('div');
      typeBadge.className = 'type-badge';
      typeBadge.title = PARKING_TYPE_LABELS[parkingType] ? this.t(PARKING_TYPE_LABELS[parkingType]) : '';
      typeBadge.textContent = PARKING_TYPE_GLYPHS[parkingType] || '';
      tile.appendChild(typeBadge);
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
          <div class="achievement-name">${this.t(def.name)}</div>
          <div class="achievement-desc">${this.t(def.description)}</div>
        </div>`;
      grid.appendChild(card);
    }
    const pct = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);
    this.el['achievements-summary'].textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} ${this.t('achievements.unlockedSuffix')} (${pct}%)`;
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
          <div class="achievement-name">${this.t(v.name)}${isSelected ? this.t('shop.selectedSuffix') : ''}</div>
          <div class="achievement-desc">${unlocked ? this.t('shop.owned') : `${v.cost}${this.t('common.coinsSuffix')}`}</div>
        </div>`;
      if (!unlocked || !isSelected) {
        const btn = document.createElement('button');
        btn.className = 'btn card-btn';
        btn.textContent = this.t(unlocked ? 'shop.use' : 'shop.buy');
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
    const activeEvent = this.save.getSettings().eventsEnabled ? getActiveEvent() : null;
    for (const c of this.save.getDailyChallenges(activeEvent?.id)) {
      const goal = c.type === 'complete' ? c.target : 1;
      const card = document.createElement('div');
      card.className = 'achievement-card' + (c.done ? ' unlocked' : ' locked');
      card.innerHTML = `
        <div class="achievement-body">
          <div class="achievement-name">${this.t(c.label)}</div>
          <div class="achievement-desc">${c.done ? this.t('daily.complete') : `${Math.min(c.progress, goal)} / ${goal}`} · +${c.reward}${this.t('common.coinsSuffix')}</div>
        </div>`;
      grid.appendChild(card);
    }
  }

  // Driving Academy module list — one card per module (achievement-card styling reused) with a
  // row of stage tiles (level-tile styling reused). Stages past the module's unlockedStage are
  // locked; each unlocked tile shows its best star count and emits 'startAcademyStage' on click.
  populateAcademy() {
    const grid = this.el['academy-grid'];
    grid.innerHTML = '';
    for (const mod of ACADEMY_MODULES) {
      const state = this.save.getAcademyModuleState(mod.id);
      const card = document.createElement('div');
      card.className = 'achievement-card academy-module-card' + (state.certified ? ' unlocked' : ' locked');
      const body = document.createElement('div');
      body.className = 'achievement-body';
      const nameEl = document.createElement('div');
      nameEl.className = 'achievement-name';
      nameEl.textContent = this.t(mod.nameKey) + (state.certified ? ` · ${this.t('academy.certified')}` : '');
      body.appendChild(nameEl);
      const stagesEl = document.createElement('div');
      stagesEl.className = 'academy-stage-row';
      for (let i = 0; i < mod.stageCount; i++) {
        const locked = i > state.unlockedStage;
        const tile = document.createElement('div');
        tile.className = 'level-tile academy-stage-tile' + (locked ? ' locked' : '');
        const num = document.createElement('div');
        num.textContent = String(i + 1);
        tile.appendChild(num);
        const stars = state.stars[i] || 0;
        if (stars > 0) {
          const starsEl = document.createElement('div');
          starsEl.className = 'stars';
          starsEl.textContent = starGlyphs(stars);
          tile.appendChild(starsEl);
        }
        if (!locked) tile.addEventListener('click', () => this.emit('startAcademyStage', { moduleId: mod.id, stageIndex: i }));
        stagesEl.appendChild(tile);
      }
      body.appendChild(stagesEl);
      card.appendChild(body);
      grid.appendChild(card);
    }
  }

  // Driving License Test route list — reuses the shop-card layout (name/description + a single
  // action button). A route that's already been passed shows a checkmark but stays replayable.
  // v1.1.0 (Feature 6): grouped under a heading per tier (Beginner/Intermediate/Advanced/
  // Professional); the Beginner tier's 3 routes render exactly as before (always unlocked), a
  // later tier's routes show a locked note instead of a Start button until the previous tier
  // is fully earned (SaveManager#isLicenseTierUnlocked).
  populateLicenseSelect() {
    const grid = this.el['license-grid'];
    grid.innerHTML = '';
    const license = this.save.getLicenseStatus();
    for (const tier of LICENSE_TIER_IDS) {
      const unlocked = this.save.isLicenseTierUnlocked(tier);
      const earned = this.save.isLicenseTierEarned(tier);
      const heading = document.createElement('h3');
      heading.className = 'progress-subhead';
      heading.textContent = `${this.t(`license.tier.${tier}`)}${earned ? ' ✓' : ''}`;
      grid.appendChild(heading);

      const tierRoutes = LICENSE_ROUTES.filter((r) => r.tier === tier);
      tierRoutes.forEach((route, idx) => {
        const passed = !!license.passedRoutes[route.id];
        const card = document.createElement('div');
        card.className = 'achievement-card' + (passed ? ' unlocked' : ' locked');
        card.innerHTML = `
          <div class="achievement-body">
            <div class="achievement-name">${this.t('license.routePrefix')}${idx + 1}${passed ? ' ✓' : ''}</div>
            <div class="achievement-desc">${route.legs.length} ${this.t('license.maneuversLabel')} · ${this.t('license.timeLimitLabel')} ${route.totalTimeLimit}s</div>
          </div>`;
        if (unlocked) {
          const btn = document.createElement('button');
          btn.className = 'btn card-btn';
          btn.textContent = this.t('license.start');
          btn.addEventListener('click', () => this.emit('startLicenseTest', route.id));
          card.appendChild(btn);
        } else {
          const lockNote = document.createElement('div');
          lockNote.className = 'achievement-desc';
          lockNote.textContent = this.t('license.tierLocked');
          card.appendChild(lockNote);
        }
        grid.appendChild(card);
      });
    }
  }

  // Shared canvas renderer for both the Academy Certificate and a passed License Test's
  // certificate — a simple bordered card (title, subtitle, recipient name, date), matching the
  // canvas-texture technique already used throughout WorldBuilder for in-world signage rather
  // than introducing an image/export library. Stored on `this._lastCertificateCanvas` so the
  // "Save Certificate" button can download whichever one was most recently rendered.
  _renderCertificateCanvas({ titleKey, subtitle, accountName }) {
    const w = 900;
    const h = 620;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.strokeStyle = 'rgba(212,175,55,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, w - 76, h - 76);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 30px sans-serif';
    ctx.direction = 'rtl';
    ctx.fillText('مسار', w / 2, 110);
    ctx.direction = 'ltr';
    ctx.font = '20px sans-serif';
    ctx.fillText('MASAR', w / 2, 145);

    ctx.fillStyle = '#f4f1e8';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(this.t(titleKey), w / 2, 250);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#c8cdd6';
    ctx.fillText(subtitle, w / 2, 310);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(accountName || 'Driver', w / 2, 400);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#8f97a3';
    ctx.fillText(new Date().toLocaleDateString(), w / 2, 450);
    ctx.fillText('Created by Saud Alqhtani · GitHub: sqp77', w / 2, h - 60);

    this._lastCertificateCanvas = canvas;
    return canvas;
  }

  _downloadCanvas(canvas, filename) {
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  }

  // Shown once a Driving Academy module's final stage is completed with every stage starred at
  // least once (see SaveManager#recordAcademyStage / GameManager's justCertified branch).
  showAcademyCertificate(moduleDef, account) {
    const canvas = this._renderCertificateCanvas({
      titleKey: 'academy.certificateTitle',
      subtitle: `${this.t('academy.certificateBody')} ${this.t(moduleDef.nameKey)}`,
      accountName: account?.name,
    });
    const wrap = this.el['academy-certificate-canvas-wrap'];
    wrap.innerHTML = '';
    wrap.appendChild(canvas);
    this.showScreen('academy-certificate');
  }

  // Shown after the final leg of a License Test route (pass or fail) — see
  // GameManager#_finishLicenseTest. On a pass, also renders the MASAR Digital Driving License
  // certificate inline using the same canvas renderer as the Academy certificate.
  showLicenseResult({ passed, timeRemaining, collisions, maxCollisions, avgAccuracy, minAccuracy, account }) {
    this.el['license-result-title'].textContent = this.t(passed ? 'license.passed' : 'license.failed');
    const statsEl = this.el['license-result-stats'];
    statsEl.innerHTML = '';
    const rows = [
      [this.t('license.summaryTime'), formatClock(timeRemaining)],
      [this.t('license.summaryCollisions'), `${collisions} / ${maxCollisions}`],
      [this.t('license.summaryAccuracy'), `${Math.round(avgAccuracy * 100)}% / ${Math.round(minAccuracy * 100)}%`],
    ];
    for (const [label, value] of rows) {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
      statsEl.appendChild(card);
    }

    const wrap = this.el['license-certificate-canvas-wrap'];
    wrap.classList.toggle('hidden', !passed);
    this.el['btn-save-license-certificate'].classList.toggle('hidden', !passed);
    if (passed) {
      const canvas = this._renderCertificateCanvas({
        titleKey: 'license.certificateTitle',
        subtitle: this.t('license.subtitle'),
        accountName: account?.name,
      });
      wrap.innerHTML = '';
      wrap.appendChild(canvas);
    }
    this.showScreen('license-result');
  }

  // Full player profile: lifetime stat cards, a per-level record table (score/time/accuracy/
  // collisions/stars sourced from SaveManager.getLevelStats — the same data level select's stars
  // come from), and a recent-achievements strip. Rebuilt each time the screen is opened rather than
  // kept live, since it's only visible from the main menu (never during gameplay).
  populateProgressScreen() {
    const totals = this.save.getTotals();
    const vehicle = VEHICLE_PRESETS.find((p) => p.id === this.save.getSelectedVehicle()) || VEHICLE_PRESETS[0];

    const favoriteVehicle = VEHICLE_PRESETS.find((p) => p.id === totals.favoriteVehicleId);
    const reputation = this.save.getReputation();
    const progression = this.save.getProgression();
    const jobStats = this.save.getJobStats();
    const statCards = [
      [this.t('progress.stat.driverRank'), this.t(reputation.rank.label)],
      [this.t('progress.stat.reputation'), reputation.score],
      [this.t('progress.stat.driverLevel'), progression.level],
      [this.t('progress.stat.vehiclesOwned'), this.save.getVehicleCount()],
      [this.t('progress.stat.licensesEarned'), `${this.save.getEarnedLicenseTierCount()} / ${LICENSE_TIER_IDS.length}`],
      [this.t('progress.stat.missionsCompleted'), jobStats.total],
      [this.t('progress.stat.currentLevel'), this.save.getLastPlayedLevel()],
      [this.t('progress.stat.highestUnlocked'), this.save.getUnlockedLevel()],
      [this.t('progress.stat.levelsCompleted'), `${totals.levelsCompleted} / ${LEVEL_COUNT}`],
      [this.t('progress.stat.totalStars'), `${totals.totalStars} / ${totals.maxStars}`],
      [this.t('progress.stat.completion'), `${totals.percentComplete}%`],
      [this.t('progress.stat.totalPlayTime'), formatPlayTime(totals.playTimeSec)],
      [this.t('progress.stat.totalDistance'), formatDistance(totals.distanceMeters)],
      [this.t('progress.stat.parksCompleted'), totals.completedParks],
      [this.t('progress.stat.totalRestarts'), totals.restarts],
      [this.t('progress.stat.totalCollisions'), totals.collisions],
      [this.t('progress.stat.highestScore'), this.save.getOverallBestScore()],
      [this.t('progress.stat.bestAccuracy'), totals.bestAccuracy > 0 ? `${Math.round(totals.bestAccuracy * 100)}%` : '—'],
      [this.t('progress.stat.averageAccuracy'), totals.averageAccuracy > 0 ? `${Math.round(totals.averageAccuracy * 100)}%` : '—'],
      [this.t('progress.stat.mostPlayedLevel'), totals.favoriteLevelId ?? '—'],
      [this.t('progress.stat.favoriteVehicle'), favoriteVehicle ? this.t(favoriteVehicle.name) : '—'],
      [this.t('progress.stat.coins'), this.save.getCoins()],
      [this.t('progress.stat.coinsEarned'), totals.coinsEarned],
      [this.t('progress.stat.currentVehicle'), this.t(vehicle.name)],
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
        row.innerHTML = `<span class="progress-row-level">${this.t('progress.rowLevelPrefix')}${i}</span><span class="progress-row-locked">${this.t('progress.locked')}</span>`;
      } else {
        const completed = stats.timesCompleted > 0;
        row.innerHTML = `
          <span class="progress-row-level">${this.t('progress.rowLevelPrefix')}${i}</span>
          <span class="progress-row-stars">${completed ? starGlyphs(stats.stars) : '—'}</span>
          <span class="progress-row-stat"><label>${this.t('progress.row.bestScore')}</label>${completed ? stats.bestScore : '—'}</span>
          <span class="progress-row-stat"><label>${this.t('progress.row.bestTime')}</label>${stats.bestTimeSec != null ? formatClock(stats.bestTimeSec) : '—'}</span>
          <span class="progress-row-stat"><label>${this.t('progress.row.accuracy')}</label>${stats.bestAccuracy != null ? Math.round(stats.bestAccuracy * 100) + '%' : '—'}</span>
          <span class="progress-row-stat"><label>${this.t('progress.row.rating')}</label>${stats.bestRatingValue != null ? this.t(ratingLabelForValue(stats.bestRatingValue)) : '—'}</span>
          <span class="progress-row-stat"><label>${this.t('progress.row.collisions')}</label>${stats.lowestCollisions != null ? stats.lowestCollisions : '—'}</span>`;
      }
      listEl.appendChild(row);
    }

    const recentEl = this.el['progress-achievements'];
    recentEl.innerHTML = '';
    const recentIds = this.save.getRecentAchievements(3);
    if (recentIds.length === 0) {
      recentEl.innerHTML = `<div class="progress-empty">${this.t('progress.noAchievements')}</div>`;
    } else {
      for (const id of recentIds) {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (!def) continue;
        const card = document.createElement('div');
        card.className = 'achievement-card unlocked';
        card.innerHTML = `
          <div class="achievement-icon">${def.icon}</div>
          <div class="achievement-body">
            <div class="achievement-name">${this.t(def.name)}</div>
            <div class="achievement-desc">${this.t(def.description)}</div>
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
        <div class="achievement-popup-title">${this.t('achievement.unlockedTitle')}</div>
        <div class="achievement-popup-name">${this.t(def.name)}</div>
        <div class="achievement-popup-desc">${this.t(def.description)}</div>
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

  updateHUD({ level, score, timeRemaining, speedKmh, gear, objective, modeLabel }) {
    this.el['hud-level'].textContent = level;
    this.el['hud-score'].textContent = Math.round(score);
    const objectiveText = this.t(objective);
    this.el['hud-objective'].textContent = modeLabel ? `${modeLabel} — ${objectiveText}` : objectiveText;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    this.el['hud-timer'].textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.el['hud-timer'].classList.toggle('low-time', timeRemaining < 15);
    this.el['hud-speed'].textContent = Math.round(speedKmh);
    this.el['hud-gear'].textContent = gear;
    this.el['hud-gear'].classList.toggle('reverse', gear === 'R');
  }

  // Brief non-blocking banner shown when a level starts — fades out on its own via CSS animation.
  showLevelIntro(levelNum, parkingType) {
    this.el['level-intro-num'].textContent = levelNum;
    this.el['level-intro-type'].textContent = PARKING_TYPE_LABELS[parkingType] ? this.t(PARKING_TYPE_LABELS[parkingType]) : '';
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

  // ---- Open World Hub (Feature 1) HUD/prompt helpers ----

  // Toggles the handful of HUD bits that only make sense during a timed level attempt
  // (Restart) vs. free-roam hub driving (rank badge) — everything else about the HUD
  // screen (pause, camera toggle, speed/gear, mobile controls) is shared as-is.
  setHubMode(active) {
    this.el['btn-hud-restart'].classList.toggle('hidden', active);
    this.el['btn-restart'].classList.toggle('hidden', active);
    this.el['hud-rank-badge'].classList.toggle('hidden', !active);
    if (!active) this.hideJobOffer();
  }

  // Same DOM elements updateHUD() drives, repurposed for hub free-roam: level -> driver
  // level, score -> live coin balance, timer -> active job's countdown (or hidden when
  // free-roaming with no job).
  updateHubBar({ level, coins, speedKmh, gear, objective, timeRemaining, hasJob }) {
    this.el['hud-level'].textContent = level;
    this.el['hud-score'].textContent = coins;
    this.el['hud-objective'].textContent = objective;
    this.el['hud-timer'].textContent = hasJob ? formatClock(timeRemaining) : '--:--';
    this.el['hud-timer'].classList.toggle('low-time', hasJob && timeRemaining < 15);
    this.el['hud-speed'].textContent = Math.round(speedKmh);
    this.el['hud-gear'].textContent = gear;
    this.el['hud-gear'].classList.toggle('reverse', gear === 'R');
  }

  updateRankBadge(rankLabelText) {
    this.el['hud-rank-badge'].textContent = rankLabelText;
  }

  showJobOffer(job) {
    const type = JOB_TYPES[job.type];
    this.el['hub-job-offer-title'].textContent = this.t(type.nameKey);
    this.el['hub-job-offer-desc'].textContent = this.t(type.descKey);
    this.el['hub-job-offer-reward'].textContent =
      `+${job.coins}${this.t('common.coinsSuffix')} · +${job.xp} XP · ${formatClock(job.timeLimit)}`;
    this.el['hub-job-offer'].classList.remove('hidden');
  }

  hideJobOffer() {
    this.el['hub-job-offer'].classList.add('hidden');
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
      [this.t('victory.row.base'), breakdown.base],
      [this.t('victory.row.timeBonus'), breakdown.timeBonus],
      [this.t('victory.row.accuracyBonus'), breakdown.accuracyBonus],
      [this.t('victory.row.noCollisionBonus'), breakdown.noCollisionBonus],
      [this.t('victory.row.penalties'), -breakdown.penalties],
      [this.t('victory.row.coinsEarned'), `+${breakdown.coins}`],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span>${label}</span><span>${value}</span>`;
      el.appendChild(row);
    }
    this.el['victory-total'].textContent = breakdown.total;
    this.el['victory-rating'].textContent = this.t(breakdown.rating);
    this.el['rating-fill'].style.width = `${Math.round(breakdown.ratingValue * 100)}%`;
    this.el['rating-percent'].textContent = `${Math.round(breakdown.ratingValue * 100)}%`;
    this.showScreen('victory');
  }

  // Drives the two proximity bars (front/rear) of the optional parking-assist HUD widget.
  // `distances` is `{ front, rear }` (meters, null = nothing in range) or null to hide entirely
  // (assist disabled).
  updateProximity(distances) {
    this.el['assist-widget'].classList.toggle('hidden', !distances);
    if (!distances) return;
    const fillFor = (dist) => (dist == null ? 0 : Math.round((1 - Math.min(dist, 4.5) / 4.5) * 100));
    this.el['assist-front-fill'].style.width = `${fillFor(distances.front)}%`;
    this.el['assist-rear-fill'].style.width = `${fillFor(distances.rear)}%`;
    this.el['assist-front-fill'].classList.toggle('near', distances.front != null && distances.front < 1.2);
    this.el['assist-rear-fill'].classList.toggle('near', distances.rear != null && distances.rear < 1.2);
  }

  showGameOver(reason) {
    this.el['gameover-reason'].textContent = this.t(reason);
    this.showScreen('gameover');
  }
}
