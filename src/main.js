import { Game } from './core/Game.js';
import { SaveManager } from './core/SaveManager.js';
import { UIManager } from './ui/UIManager.js';

const save = new SaveManager();
const ui = new UIManager(save);
const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.attachSaveManager(save);
game.setMuted(save.muted);
ui.setSoundIcon(save.muted);

// ---------------- Wire game -> UI ----------------

game.onScoreChange = (score) => ui.updateScore(score);
game.onTimeChange = (t) => ui.updateTime(t);
game.onItemsChange = (n) => ui.updateItems(n);
game.onCombo = (multiplier, active) => ui.updateCombo(multiplier, active);
game.onScorePopup = (text, x, y, negative) => ui.spawnScorePopup(text, x, y, negative);
game.onAchievement = (def) => ui.showAchievement(def);
game.onCrashFlash = () => ui.flashCrash();
game.onFinishStart = () => ui.showFinishFlash();
game.onGameEnd = (stats) => {
  setTimeout(() => {
    ui.showScreens(['results']);
    ui.showResults(stats);
  }, 250);
};

// ---------------- Loading sequence ----------------

function boot() {
  let pct = 0;
  const texts = ['جارٍ تحميل المشهد ثلاثي الأبعاد...', 'جارٍ إعداد الشاحنة...', 'جارٍ تجهيز الطريق والبيئة...', 'على وشك الانطلاق...'];
  const interval = setInterval(() => {
    pct = Math.min(100, pct + 8 + Math.random() * 10);
    ui.setLoadingProgress(pct, texts[Math.min(texts.length - 1, Math.floor((pct / 100) * texts.length))]);
    if (pct >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        ui.refreshMenuStats();
        ui.showScreens(['menu']);
      }, 250);
    }
  }, 120);
}

boot();

// ---------------- Menu buttons ----------------

document.getElementById('btn-start').addEventListener('click', () => {
  game.audio.playUIClick();
  ui.showScreens(['hud']);
  game.start();
});

document.getElementById('btn-howto').addEventListener('click', () => {
  game.audio.resume();
  game.audio.playUIClick();
  ui.showScreens(['howto']);
});
document.getElementById('btn-howto-back').addEventListener('click', () => {
  game.audio.playUIClick();
  ui.showScreens(['menu']);
});

document.getElementById('btn-leaderboard').addEventListener('click', () => {
  game.audio.resume();
  game.audio.playUIClick();
  ui.renderLeaderboard();
  ui.showScreens(['leaderboard']);
});
document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
  game.audio.playUIClick();
  ui.showScreens(['menu']);
});

document.getElementById('btn-sound').addEventListener('click', () => {
  const muted = !save.muted;
  save.setMuted(muted);
  game.setMuted(muted);
  ui.setSoundIcon(muted);
});

// ---------------- In-game controls ----------------

document.getElementById('btn-pause').addEventListener('click', () => {
  game.pause();
  ui.showScreens(['hud', 'pause']);
});
document.getElementById('btn-resume').addEventListener('click', () => {
  game.resume();
  ui.showScreens(['hud']);
});
document.getElementById('btn-restart-from-pause').addEventListener('click', () => {
  ui.showScreens(['hud']);
  game.start();
});
document.getElementById('btn-quit-to-menu').addEventListener('click', () => {
  game.pause();
  game._resetState();
  ui.refreshMenuStats();
  ui.showScreens(['menu']);
});

document.getElementById('btn-touch-left').addEventListener('click', () => game.requestLaneChange(-1));
document.getElementById('btn-touch-right').addEventListener('click', () => game.requestLaneChange(1));

// ---------------- Results ----------------

document.getElementById('btn-play-again').addEventListener('click', () => {
  game.audio.playUIClick();
  ui.showScreens(['hud']);
  game.start();
});
document.getElementById('btn-results-menu').addEventListener('click', () => {
  game.audio.playUIClick();
  ui.refreshMenuStats();
  ui.showScreens(['menu']);
});

// Resume AudioContext on first user gesture (browser autoplay policies).
window.addEventListener(
  'pointerdown',
  () => {
    game.audio.resume();
  },
  { once: true }
);
