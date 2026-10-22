import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'customer_data';
const TOKEN_KEY   = 'customer_token';

@Injectable({ providedIn: 'root' })
export class CustomerAuthService {

    private _customer$ = new BehaviorSubject<any>(this.loadCustomer());
    customer$ = this._customer$.asObservable();

    get customer(): any { return this._customer$.getValue(); }
    get isLoggedIn(): boolean { return !!this.customer; }
    get token(): string { return localStorage.getItem(TOKEN_KEY) || ''; }

    logout() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        this._customer$.next(null);
    }

    private loadCustomer(): any {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(atob(raw)) : null;
        } catch { return null; }
    }
}
