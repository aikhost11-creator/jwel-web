import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CartService, CartItem } from '../../shared/services/cart.service';

@Component({
    selector: 'app-cart',
    standalone: false,
    templateUrl: './cart.component.html',
    styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {

    items: CartItem[] = [];
    savedItems: CartItem[] = [];
    private sub!: Subscription;

    constructor(public cartService: CartService) {}

    ngOnInit(): void {
        this.sub = this.cartService.items$.subscribe(items => {
            this.items = items;
        });
    }

    ngOnDestroy(): void { this.sub?.unsubscribe(); }

    get total(): number { return this.cartService.getTotal(); }
    get count(): number { return this.cartService.getCount(); }

    decrement(item: CartItem): void {
        this.cartService.updateQty(item.id, item.quantity - 1, item.selectedOptions);
    }

    increment(item: CartItem): void {
        this.cartService.updateQty(item.id, item.quantity + 1, item.selectedOptions);
    }

    remove(item: CartItem): void {
        this.cartService.removeItem(item.id, item.selectedOptions);
    }

    saveForLater(item: CartItem): void {
        this.savedItems = [{ ...item }, ...this.savedItems];
        this.remove(item);
    }

    moveToCart(item: CartItem): void {
        this.cartService.addItem(item, item.quantity, item.selectedOptions);
        this.savedItems = this.savedItems.filter(
            s => !(s.id === item.id && JSON.stringify(s.selectedOptions) === JSON.stringify(item.selectedOptions))
        );
    }

    getOptionEntries(options: { [key: string]: string }): { key: string; value: string }[] {
        return Object.entries(options || {}).map(([key, value]) => ({ key, value }));
    }

    trackById(_: number, item: CartItem): number { return item.id; }
}
