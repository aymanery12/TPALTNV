import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      this._applyLight();
    } else {
      this._applyDark(); // dark par défaut
    }
  }

  toggle(): void {
    if (this.isDark()) {
      this._applyLight();
    } else {
      this._applyDark();
    }
  }

  private _applyDark(): void {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark');
    this.isDark.set(true);
  }

  private _applyLight(): void {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
    this.isDark.set(false);
  }
}