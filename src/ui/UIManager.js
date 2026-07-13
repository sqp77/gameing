import { ITEM_TYPES } from '../core/Constants.js';
import { Confetti } from './Confetti.js';

const CATEGORY_ELEMENT_IDS = {
  plastic: 'res-plastic',
  metal: 'res-metal',
  cardboard: 'res-cardboard',
  paper: 'res-paper',
  glass: 'res-glass',
};

const ECO_MESSAGES = [
  'أحسنت! لقد ساهمت في جمع المواد القابلة لإعادة التدوير والمساعدة في المحافظة على البيئة.',
  'عمل رائع! كل عنصر تجمعه يقربنا خطوة من مستقبل أكثر استدامة.',
  'ممتاز! مساهمتك اليوم تدعم رؤية المملكة نحو بيئة أنظف وأكثر خضرة.',
];

function el(id) {
  return document.getElementById(id);
}

export class UIManager {
  constructor(saveManager) {
    this.save = saveManager;
    this.confetti = new Confetti(el('confetti-canvas'));
    this._popupLayer = el('popup-layer');
    this._achievementQueue = [];
    this._achievementBusy = false;

    this._cacheEls();
  }

  _cacheEls() {
    this.screens = {
      loading: el('loading-screen'),
      menu: el('main-menu'),
      howto: el('howto-screen'),
      leaderboard: el('leaderboard-screen'),
      hud: el('hud'),
      pause: el('pause-screen'),
      results: el('results-screen'),
    };
  }

  showScreen(name) {
    for (const key of Object.keys(this.screens)) {
      this.screens[key].classList.toggle('hidden', key !== name);
    }
  }

  showScreens(names) {
    for (const key of Object.keys(this.screens)) {
      this.screens[key].classList.toggle('hidden', !names.includes(key));
    }
  }

  setLoadingProgress(pct, text) {
    el('loading-bar-fill').style.width = `${pct}%`;
    if (text) el('loading-text').textContent = text;
  }

  refreshMenuStats() {
    el('menu-best-score').textContent = this.save.bestScore.toLocaleString('en-US');
    el('menu-total-items').textContent = this.save.totalItems.toLocaleString('en-US');
  }

  setSoundIcon(muted) {
    el('sound-icon').textContent = muted ? '🔇' : '🔊';
  }

  // ---------------- HUD ----------------

  updateScore(score) {
    el('hud-score').textContent = score.toLocaleString('en-US');
  }

  updateTime(t) {
    const node = el('hud-time');
    node.textContent = t;
    el('hud-time').parentElement.classList.toggle('time-warning', t <= 10);
  }

  updateItems(count) {
    el('hud-items').textContent = count;
  }

  updateCombo(multiplier, active) {
    const indicator = el('combo-indicator');
    if (active && multiplier > 1) {
      indicator.classList.remove('hidden');
      el('combo-count').textContent = `x${multiplier}`;
      indicator.classList.remove('combo-indicator');
      void indicator.offsetWidth;
      indicator.classList.add('combo-indicator');
    } else {
      indicator.classList.add('hidden');
    }
  }

  spawnScorePopup(text, xPercent, yPercent, negative) {
    const node = document.createElement('div');
    node.className = 'score-popup' + (negative ? ' negative' : '');
    node.textContent = text;
    node.style.left = `${xPercent}%`;
    node.style.top = `${yPercent}%`;
    this._popupLayer.appendChild(node);
    setTimeout(() => node.remove(), 950);
  }

  flashCrash() {
    document.body.style.transition = 'none';
    document.body.style.boxShadow = 'inset 0 0 120px rgba(239,68,68,0.55)';
    requestAnimationFrame(() => {
      document.body.style.transition = 'box-shadow 0.4s ease';
      document.body.style.boxShadow = 'inset 0 0 0 rgba(239,68,68,0)';
    });
  }

  showAchievement(def) {
    this._achievementQueue.push(def);
    this._drainAchievementQueue();
  }

  _drainAchievementQueue() {
    if (this._achievementBusy || this._achievementQueue.length === 0) return;
    this._achievementBusy = true;
    const def = this._achievementQueue.shift();
    const toast = el('achievement-toast');
    el('achievement-name').textContent = def.name;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
      this._achievementBusy = false;
      this._drainAchievementQueue();
    }, 2600);
  }

  // ---------------- Leaderboard ----------------

  renderLeaderboard() {
    const list = el('leaderboard-list');
    const empty = el('leaderboard-empty');
    list.innerHTML = '';
    if (this.save.leaderboard.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    this.save.leaderboard.forEach((entry, i) => {
      const li = document.createElement('li');
      if (i === 0) li.classList.add('top1');
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'short' });
      li.innerHTML = `<span class="rank">#${i + 1}</span><span>${entry.score.toLocaleString('en-US')} نقطة</span><span style="opacity:.6;font-size:12px">${dateStr}</span>`;
      list.appendChild(li);
    });
  }

  // ---------------- Results ----------------

  showResults(stats) {
    el('res-score').textContent = stats.score.toLocaleString('en-US');
    el('res-items').textContent = stats.items;
    el('res-distance').textContent = `${stats.distance.toLocaleString('en-US')} م`;
    el('res-time').textContent = `${stats.playTime} ث`;

    for (const [category, id] of Object.entries(CATEGORY_ELEMENT_IDS)) {
      el(id).textContent = stats.categories[category] || 0;
    }

    const starsEl = document.querySelectorAll('#star-rating .star');
    starsEl.forEach((star, i) => {
      star.classList.toggle('filled', i < stats.stars.stars);
    });
    el('performance-label').textContent = stats.isNewBest
      ? `${stats.stars.label} 🎉 رقم قياسي جديد!`
      : stats.stars.label;

    const message = ECO_MESSAGES[Math.floor(Math.random() * ECO_MESSAGES.length)];
    el('eco-message').textContent = message;

    const statsList = el('eco-stats');
    statsList.innerHTML = '';
    const lines = [];
    for (const [category, id] of Object.entries(CATEGORY_ELEMENT_IDS)) {
      const count = stats.categories[category] || 0;
      if (count > 0) {
        const name = Object.values(ITEM_TYPES).find((t) => t.category === category)?.name || category;
        lines.push(`تم جمع ${count} ${name}${count > 1 ? '(ات)' : ''}.`);
      }
    }
    lines.push('ساهمت في تقليل النفايات وحماية البيئة.');
    lines.push('دعمت ثقافة إعادة التدوير في المملكة العربية السعودية.');
    for (const line of lines) {
      const li = document.createElement('li');
      li.textContent = line;
      statsList.appendChild(li);
    }

    if (stats.stars.stars >= 4) {
      this.confetti.burst(180);
    } else if (stats.stars.stars >= 3) {
      this.confetti.burst(90);
    }

    this.refreshMenuStats();
  }

  clearFinishFlash() {
    const flash = el('finish-flash');
    flash.classList.add('hidden');
  }

  showFinishFlash() {
    const flash = el('finish-flash');
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 1100);
  }
}
