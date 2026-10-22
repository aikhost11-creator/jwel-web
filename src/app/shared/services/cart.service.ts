import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CustomerAuthService } from './customer-auth.service';

export interface CartItem {
    id: number;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    image: string;
    quantity: number;
    selectedOptions: { [key: string]: string };
}

@Injectable({ providedIn: 'root' })
export class CartService {

    private _items$ = new BehaviorSubject<CartItem[]>([]);
    items$ = this._items$.asObservable();

    get items(): CartItem[] { return this._items$.getValue(); }
    get count(): number { return this.items.reduce((sum, i) => sum + i.quantity, 0); }

    constructor(private authService: CustomerAuthService) {
        this._items$.next(this.load());

        // When customer logs in, merge guest cart into customer cart
        this.authService.customer$.subscribe(customer => {
            if (customer) {
                this.mergeGuestCart();
            } else {
                // Logged out — load guest cart
                this._items$.next(this.load());
            }
        });
    }

    private storageKey(): string {
        const customer = this.authService.customer;
        return customer ? `cart_${customer.id}` : 'cart_guest';
    }

    private load(): CartItem[] {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey()) || '[]');
        } catch { return []; }
    }

    private save(items: CartItem[]): void {
        try {
            localStorage.setItem(this.storageKey(), JSON.stringify(items));
        } catch {}
    }

    private mergeGuestCart(): void {
        try {
            const guestItems: CartItem[] = JSON.parse(localStorage.getItem('cart_guest') || '[]');
            const customerItems: CartItem[] = JSON.parse(localStorage.getItem(this.storageKey()) || '[]');

            if (guestItems.length === 0) {
                this._items$.next(customerItems);
                return;
            }

            const merged = [...customerItems];
            for (const guestItem of guestItems) {
                const key = this.itemKey(guestItem.id, guestItem.selectedOptions);
                const existing = merged.find(i => this.itemKey(i.id, i.selectedOptions) === key);
                if (existing) {
                    existing.quantity += guestItem.quantity;
                } else {
                    merged.push({ ...guestItem });
                }
            }

            this.save(merged);
            this._items$.next(merged);
            localStorage.removeItem('cart_guest');
        } catch {}
    }

    private itemKey(id: number, options: { [key: string]: string }): string {
        const optStr = Object.entries(options || {}).sort().map(([k, v]) => `${k}:${v}`).join('|');
        return `${id}__${optStr}`;
    }

    addItem(product: any, qty: number = 1, options: { [key: string]: string } = {}): void {
        const current = [...this.items];
        const key = this.itemKey(product.id, options);
        const existing = current.find(i => this.itemKey(i.id, i.selectedOptions) === key);

        if (existing) {
            existing.quantity += qty;
        } else {
            current.push({
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                salePrice: product.salePrice || null,
                image: product.images?.[0] || '',
                quantity: qty,
                selectedOptions: { ...options }
            });
        }

        this.save(current);
        this._items$.next(current);
    }

    removeItem(id: number, options: { [key: string]: string } = {}): void {
        const key = this.itemKey(id, options);
        const updated = this.items.filter(i => this.itemKey(i.id, i.selectedOptions) !== key);
        this.save(updated);
        this._items$.next(updated);
    }

    updateQty(id: number, qty: number, options: { [key: string]: string } = {}): void {
        if (qty <= 0) { this.removeItem(id, options); return; }
        const key = this.itemKey(id, options);
        const updated = this.items.map(i =>
            this.itemKey(i.id, i.selectedOptions) === key ? { ...i, quantity: qty } : i
        );
        this.save(updated);
        this._items$.next(updated);
    }

    clearCart(): void {
        this.save([]);
        this._items$.next([]);
    }

    getTotal(): number {
        return this.items.reduce((sum, i) => sum + (i.salePrice ?? i.price) * i.quantity, 0);
    }

    getCount(): number { return this.count; }

    isInCart(id: number): boolean {
        return this.items.some(i => i.id === id);
    }

    getItemQty(id: number): number {
        return this.items.filter(i => i.id === id).reduce((sum, i) => sum + i.quantity, 0);
    }
}
