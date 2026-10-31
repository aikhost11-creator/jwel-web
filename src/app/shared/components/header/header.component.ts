import { Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SharedService } from '../../services/shared.service';
import { AppStoreService } from '../../services/app-store.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { CartService } from '../../services/cart.service';
import { FavouritesService } from '../../services/favourites.service';
import { Subscription } from 'rxjs';

export interface DynSubLink { id: number; name: string; image: string; }
export interface DynSection  { id: number; name: string; image: string; children: DynSubLink[]; }
export interface DynNavItem  { id: number; label: string; image: string; sections: DynSection[]; }

@Component({
    selector: 'app-header',
    standalone: false,
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {

    @ViewChild('searchInput') searchInputRef: ElementRef<HTMLInputElement>;

    searchTxt = '';
    searchOpen = false;
    pinOpen = false;
    deliverPin = '';
    pinDraft = '';
    announceIndex = 0;
    hintIndex = 0;
    private announceTimer: any;
    private readonly searchHints = ['Rings', 'Pendants', 'Earrings', 'Bracelets', 'Necklaces'];

    get logoUrl(): string {
        return this.sharedService.siteConfig?.logo || 'assets/img/default/logo.png';
    }

    get siteName(): string {
        return this.sharedService.siteConfig?.siteName || 'Alpha Jewel';
    }

    get marqueeLoop(): { emoji: string; text: string }[] {
        const raw = this.sharedService.siteConfig?.marqueeItems;
        const list = Array.isArray(raw) && raw.length ? raw : [
            { emoji: '✦', text: 'Complimentary shipping on prepaid orders' },
            { emoji: '◆', text: 'Hallmarked gold and certified stones' },
            { emoji: '✧', text: 'Easy returns within 7 days' },
            { emoji: '◈', text: 'Quick checkout available' },
        ];
        return [...list, ...list, ...list];
    }

    cartDropOpen    = false;
    accountDropOpen = false;
    drawerOpen      = false;

    dynNavItems: DynNavItem[] = [];
    activeMenuId: number | null = null;
    activeSection: DynSection | null = null;

    private menuOpen = false;
    private closeTimer: any;
    private catSub: Subscription;

    constructor(
        public sharedService: SharedService,
        private appStore: AppStoreService,
        public authService: CustomerAuthService,
        public cartService: CartService,
        public favService: FavouritesService,
        private router: Router
    ) {}

    get searchPlaceholder(): string {
        return `Search "${this.searchHints[this.hintIndex]}"`;
    }

    get announceText(): string {
        const raw = this.sharedService.siteConfig?.marqueeItems;
        const list = Array.isArray(raw) && raw.length
            ? raw.map((item: any) => String(item?.text || '').trim()).filter(Boolean)
            : ['Easy returns within 7 days'];
        return list[this.announceIndex % list.length];
    }

    ngOnInit(): void {
        this.deliverPin = localStorage.getItem('deliver_pincode') || '';
        this.pinDraft = this.deliverPin;
        this.announceTimer = setInterval(() => {
            this.announceIndex++;
            this.hintIndex = (this.hintIndex + 1) % this.searchHints.length;
        }, 2800);
        if (this.appStore.categories.length > 0) {
            this.dynNavItems = this.buildNavItems(this.appStore.categories);
        }
        this.catSub = this.appStore.categories$.subscribe(cats => {
            if (cats.length > 0) this.dynNavItems = this.buildNavItems(cats);
        });
    }

    ngOnDestroy(): void {
        if (this.catSub) this.catSub.unsubscribe();
        clearTimeout(this.closeTimer);
        clearInterval(this.announceTimer);
    }

    togglePin(e: Event) {
        e.stopPropagation();
        this.pinOpen = !this.pinOpen;
        this.accountDropOpen = false;
        this.pinDraft = this.deliverPin;
    }

    savePin() {
        const pin = this.pinDraft.replace(/\D/g, '').slice(0, 6);
        if (pin.length !== 6) return;
        this.deliverPin = pin;
        localStorage.setItem('deliver_pincode', pin);
        this.pinOpen = false;
    }

    goAccount() {
        this.accountDropOpen = !this.accountDropOpen;
        this.pinOpen = false;
    }

    goCart() {
        this.router.navigate(this.cartService.getCount() ? ['/checkout'] : ['/shop']);
    }

    buildNavItems(flat: any[]): DynNavItem[] {
        const roots = flat
            .filter(c => !c.parentId)
            .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

        return roots.map(root => {
            const level1 = flat
                .filter(c => c.parentId === root.id)
                .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

            const sections: DynSection[] = level1.map(sec => {
                const level2 = flat
                    .filter(c => c.parentId === sec.id)
                    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
                return {
                    id: sec.id,
                    name: sec.name,
                    image: sec.image || '',
                    children: level2.map(l => ({ id: l.id, name: l.name, image: l.image || '' }))
                };
            });

            return { id: root.id, label: root.name, image: root.image || '', sections };
        });
    }

    get activeNavItem(): DynNavItem | null {
        return this.dynNavItems.find(n => n.id === this.activeMenuId) || null;
    }

    openMenu(id: number) {
        clearTimeout(this.closeTimer);
        this.menuOpen = true;
        this.activeMenuId = id;
        const item = this.dynNavItems.find(n => n.id === id);
        this.activeSection = item?.sections?.[0] || null;
    }

    keepMenu() {
        clearTimeout(this.closeTimer);
        this.menuOpen = true;
    }

    scheduleClose() {
        this.menuOpen = false;
        this.closeTimer = setTimeout(() => {
            if (!this.menuOpen) {
                this.activeMenuId = null;
                this.activeSection = null;
            }
        }, 100);
    }

    setSection(sec: DynSection) { this.activeSection = sec; }

    toggleSearch() {
        this.searchOpen = !this.searchOpen;
        if (this.searchOpen) {
            setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 50);
        }
    }

    onSearchBlur() {
        if (!this.searchTxt.trim()) {
            setTimeout(() => { this.searchOpen = false; }, 150);
        }
    }

    onSearch() {
        if (this.searchTxt.trim()) {
            this.router.navigate(['/shop'], { queryParams: { search: this.searchTxt.trim() } });
            this.searchOpen = false;
        }
    }

    toggleCartDrop(e: Event) {
        e.stopPropagation();
        this.cartDropOpen = !this.cartDropOpen;
        if (this.cartDropOpen) this.accountDropOpen = false;
    }

    goToCart() {
        this.cartDropOpen = false;
        this.router.navigate(['/shop']);
    }

    goToCheckout() {
        this.cartDropOpen = false;
        this.router.navigate(['/checkout']);
    }

    toggleAccountDrop(e: Event) {
        e.stopPropagation();
        this.accountDropOpen = !this.accountDropOpen;
        if (this.accountDropOpen) this.cartDropOpen = false;
    }

    closeAccountDrop() { this.accountDropOpen = false; }

    signOut() {
        this.authService.logout();
        this.accountDropOpen = false;
    }

    openDrawer() {
        this.drawerOpen = true;
        document.body.style.overflow = 'hidden';
    }

    closeDrawer() {
        this.drawerOpen = false;
        document.body.style.overflow = '';
    }

    @HostListener('document:click')
    onDocClick() {
        this.accountDropOpen = false;
        this.cartDropOpen = false;
        this.pinOpen = false;
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        this.accountDropOpen = false;
        this.cartDropOpen = false;
        this.closeDrawer();
        this.activeMenuId = null;
        this.activeSection = null;
    }
}
