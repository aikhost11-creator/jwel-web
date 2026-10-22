import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FavouriteItem {
    id: number;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    images: string[];
    brandName?: string;
}

const STORAGE_KEY = 'favourites';

@Injectable({ providedIn: 'root' })
export class FavouritesService {

    private _items$ = new BehaviorSubject<FavouriteItem[]>(this.load());
    items$ = this._items$.asObservable();

    get items(): FavouriteItem[] { return this._items$.getValue(); }
    get count(): number { return this.items.length; }

    isFavourite(id: number): boolean {
        return this.items.some(i => i.id === id);
    }

    toggle(item: FavouriteItem): boolean {
        const current = this.items;
        const exists = current.findIndex(i => i.id === item.id);
        let updated: FavouriteItem[];

        if (exists >= 0) {
            updated = current.filter(i => i.id !== item.id);
        } else {
            updated = [item, ...current];
        }

        this.save(updated);
        this._items$.next(updated);
        return exists < 0; // true = added, false = removed
    }

    remove(id: number): void {
        const updated = this.items.filter(i => i.id !== id);
        this.save(updated);
        this._items$.next(updated);
    }

    clear(): void {
        this.save([]);
        this._items$.next([]);
    }

    private load(): FavouriteItem[] {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch { return []; }
    }

    private save(items: FavouriteItem[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }
}
