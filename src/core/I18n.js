/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { STRINGS } from '../data/strings.js';

// Minimal hand-rolled i18n: a flat "key" -> {en, ar} lookup table (data/strings.js), {0}/{1}
// positional interpolation, and RTL applied via the <html dir> attribute (which mirrors flexbox
// layouts automatically — the handful of fixed-corner absolutely-positioned widgets get a small
// [dir="rtl"] override in style.css instead). Deliberately no external i18n library: the string
// table is small enough that a dependency would cost more than it saves.
export class I18n extends EventEmitter {
  constructor(saveManager) {
    super();
    this.save = saveManager;
    this.lang = saveManager.getSettings().language || 'en';
    this._applyDocumentDir();
  }

  getLanguage() {
    return this.lang;
  }

  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ar') return;
    if (lang === this.lang) return;
    this.lang = lang;
    this.save.updateSettings({ language: lang });
    this._applyDocumentDir();
    this.apply(document);
    this.emit('change', lang);
  }

  _applyDocumentDir() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
  }

  // Looks up `key` and substitutes {0},{1},... with `args`. An unknown key falls back to the
  // key itself so a missing translation is visible/debuggable in the UI rather than blank.
  t(key, ...args) {
    const entry = STRINGS[key];
    let text = entry ? entry[this.lang] || entry.en : key;
    for (let i = 0; i < args.length; i++) text = text.replace(`{${i}}`, args[i]);
    return text;
  }

  // Sweeps `root` for data-i18n(-title|-placeholder) attributes and fills them from the
  // current language. Called once at boot and again on every language change; all static
  // (non-templated) UI copy lives in index.html and is translated this way.
  apply(root = document) {
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = this.t(el.dataset.i18n);
    for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = this.t(el.dataset.i18nTitle);
    for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = this.t(el.dataset.i18nPlaceholder);
  }
}
