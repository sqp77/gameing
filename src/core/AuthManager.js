/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

import { EventEmitter } from '../utils/EventEmitter.js';

const STORAGE_KEY = 'parkmaster3d.accounts.v1';

export const PROVIDER_LABELS = { apple: 'Apple', google: 'Google', facebook: 'Facebook', xbox: 'Xbox' };

function defaultData() {
  return { accounts: [], activeAccountId: null };
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function makeId() {
  return `acct_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Local, on-device profile system: this build has no backend to exchange real OAuth tokens
// with, so "Sign in with X" captures which provider the player picked (for badge/branding) and
// creates an on-device profile rather than performing an actual handshake. What IS real: each
// profile gets its own SaveManager save slot (see SaveManager.switchAccount/claimGuestData), so
// multiple local profiles, logout, and switching behave like a genuine multi-account game.
// Swapping in a real provider SDK later only means replacing what feeds `signIn()`.
export class AuthManager extends EventEmitter {
  constructor(saveManager) {
    super();
    this.saveManager = saveManager;
    this.data = this._load();
    // Resume into whichever account was active last session — SaveManager otherwise has no idea
    // an account is active and stays on the guest save slot.
    if (this.getActiveAccount()) this.saveManager.switchAccount(this.data.activeAccountId);
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      return { ...defaultData(), ...JSON.parse(raw) };
    } catch {
      return defaultData();
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable — session-only, same graceful fallback as SaveManager */
    }
  }

  getAccounts() {
    return this.data.accounts;
  }

  getActiveAccount() {
    return this.data.accounts.find((a) => a.id === this.data.activeAccountId) || null;
  }

  // Creates a new local profile for `provider` and makes it active. The very first account ever
  // created on a device claims whatever guest progress already exists (see
  // SaveManager.claimGuestData); every subsequent one starts with its own fresh save.
  signIn({ provider, name, email }) {
    const isFirstEver = this.data.accounts.length === 0;
    const account = {
      id: makeId(),
      provider,
      name: (name || 'Driver').trim().slice(0, 24),
      email: (email || '').trim(),
      avatarHue: hashHue(`${provider}:${name}:${Date.now()}`),
      createdAt: Date.now(),
    };
    this.data.accounts.push(account);
    if (isFirstEver) this.saveManager.claimGuestData(account.id);
    else this.saveManager.switchAccount(account.id);
    this.data.activeAccountId = account.id;
    this._persist();
    this.emit('login', account);
    return account;
  }

  // Re-activates an existing local profile (account picker, or logging back in after logout).
  selectAccount(id) {
    const account = this.data.accounts.find((a) => a.id === id);
    if (!account) return null;
    this.saveManager.switchAccount(id);
    this.data.activeAccountId = id;
    this._persist();
    this.emit('login', account);
    return account;
  }

  // Flushes the active account's progress back to its own slot and returns to the device's
  // guest save — nothing is lost; selectAccount() restores it later.
  logout() {
    this.saveManager.switchAccount(null);
    this.data.activeAccountId = null;
    this._persist();
    this.emit('logout');
  }

  removeAccount(id) {
    const wasActive = this.data.activeAccountId === id;
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    if (wasActive) {
      this.saveManager.switchAccount(null);
      this.data.activeAccountId = null;
    }
    this.saveManager.deleteAccountData(id);
    this._persist();
  }
}
