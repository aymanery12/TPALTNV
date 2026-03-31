import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _count = 0;
  private _hideTimer: any = null;
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this._loading$.asObservable();

  show(): void {
    // Annuler tout timer de masquage en cours
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    this._count++;
    this._loading$.next(true);
  }

  hide(): void {
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) {
      // Délai de 250ms pour éviter le flash sur les requêtes très rapides
      this._hideTimer = setTimeout(() => {
        if (this._count === 0) {
          this._loading$.next(false);
        }
        this._hideTimer = null;
      }, 250);
    }
  }
}
