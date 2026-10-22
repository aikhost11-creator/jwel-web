import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuickCheckoutService {

    private _open$ = new BehaviorSubject<any | null>(null);
    open$ = this._open$.asObservable();

    open(product: any, qty: number = 1, selectedOptions: { [k: string]: string } = {}) {
        this._open$.next({ product, qty, selectedOptions });
    }

    close() { this._open$.next(null); }
}
