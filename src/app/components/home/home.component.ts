import { Component, OnInit, OnDestroy, HostListener, PLATFORM_ID, Inject, ViewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../../shared/services/product.service';
import { CartService } from '../../shared/services/cart.service';
import { FavouritesService } from '../../shared/services/favourites.service';
import { SharedService } from '../../shared/services/shared.service';
import { QuickCheckoutService } from '../../shared/services/quick-checkout.service';
import { HomeBannerService } from '../../shared/services/home-banner.service';
import { HomeSlotService } from '../../shared/services/home-slot.service';
import { ReelsService } from '../../shared/services/reels.service';
import { AppStoreService } from '../../shared/services/app-store.service';

@Component({
    selector: 'app-home',
    standalone: false,
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {

    products: any[] = [];
    productTotal = 0;
    productsLoading = true;

    banners: any[] = [];
    bannersLoading = true;
    slideIndex = 0;
    private slideTimer: any;

    reels: any[] = [];
    activeReel: any = null;
    @ViewChild('reelsTrack') reelsTrack?: ElementRef<HTMLElement>;
    @ViewChild('catTrack') catTrack?: ElementRef<HTMLElement>;
    rootCategories: any[] = [];

    activeImg:       { [id: number]: number } = {};
    qty:             { [id: number]: number } = {};
    selectedVariant: { [id: number]: { [vi: number]: number } } = {};

    homeSearch = '';
    perkKeys = ['perk_1', 'perk_2', 'perk_3', 'perk_4'];
    giftKeys = ['gift_1', 'gift_2', 'gift_3'];
    storyKeys = ['story_1', 'story_2', 'story_3', 'story_4'];
    bondKeys = ['bond_1', 'bond_2', 'bond_3', 'bond_4', 'bond_5', 'bond_6', 'bond_7', 'bond_8', 'bond_9'];
    slots: { [key: string]: any } = {};
    isMobile = false;
    private catSub?: Subscription;

    constructor(
        private productService: ProductService,
        public cartService: CartService,
        public favService: FavouritesService,
        private router: Router,
        public sharedservice: SharedService,
        public qcService: QuickCheckoutService,
        private bannersApi: HomeBannerService,
        private homeSlotsApi: HomeSlotService,
        private reelsApi: ReelsService,
        public appStore: AppStoreService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {}

    ngOnInit(): void {
        this.checkDevice();
        this.loadProducts();
        this.loadBanners();
        this.loadSlots();
        this.loadReels();
        this.rootCategories = this.appStore.rootCategories;
        this.catSub = this.appStore.categories$.subscribe(() => {
            this.rootCategories = this.appStore.rootCategories;
        });
    }

    get visibleBanners(): any[] {
        const wantMobile = this.isMobile;
        const exact = this.banners.filter(b => !!Number(b.forMobile) === wantMobile);
        return exact.length ? exact : this.banners;
    }

    get siteName(): string {
        return this.sharedservice.siteConfig?.siteName || 'Alpha Jewel';
    }

    get tagline(): string {
        return this.sharedservice.siteConfig?.tagline || 'Fine jewellery, made to be lived in.';
    }

    loadBanners() {
        this.bannersApi.getActiveBanners().pipe(catchError(() => of({ data: [] }))).subscribe((res: any) => {
            this.banners = res?.data || [];
            this.bannersLoading = false;
            this.slideIndex = 0;
            this.startSlider();
        });
    }

    loadSlots() {
        this.homeSlotsApi.getActive().pipe(catchError(() => of({ data: [] }))).subscribe((res: any) => {
            const map: { [key: string]: any } = {};
            (res?.data || []).forEach((row: any) => { map[row.slotKey] = row; });
            this.slots = map;
        });
    }

    slot(key: string): any {
        return this.slots[key] || {};
    }

    openSlot(row: any) {
        const url = row?.link || '/shop';
        if (/^https?:/i.test(url)) {
            window.open(url, '_blank');
            return;
        }
        this.router.navigateByUrl(url);
    }

    loadReels() {
        this.reelsApi.getActive().pipe(catchError(() => of({ data: [] }))).subscribe((res: any) => {
            this.reels = res?.data || [];
        });
    }

    loadProducts() {
        this.productService.getProducts({ limit: 40, offset: 0 })
            .pipe(catchError(() => of({ data: [] })))
            .subscribe((res: any) => {
                const raw = res?.data || res?.products || [];
                this.productTotal = Number(res?.totalCount || raw.length);
                this.products = raw.map((p: any) => ({
                    ...p,
                    images:   this.parseJson(p.images,   []),
                    benefits: this.parseJson(p.benefits, []),
                    variants: this.parseJson(p.variants, []),
                }));
                this.products.forEach(p => {
                    this.activeImg[p.id] = 0;
                    this.qty[p.id] = 1;
                    this.selectedVariant[p.id] = {};
                });
                this.productsLoading = false;
            });
    }

    startSlider() {
        this.stopSlider();
        if (!isPlatformBrowser(this.platformId) || document.hidden) return;
        if (this.visibleBanners.length < 2) return;
        this.slideTimer = setInterval(() => this.stepSlide(1), 5500);
    }

    @HostListener('document:visibilitychange')
    onVisibility() {
        if (document.hidden) this.stopSlider();
        else this.startSlider();
    }

    stopSlider() {
        if (this.slideTimer) clearInterval(this.slideTimer);
    }

    stepSlide(dir: number, event?: Event) {
        event?.stopPropagation();
        const total = this.visibleBanners.length;
        if (!total) return;
        this.slideIndex = (this.slideIndex + dir + total) % total;
        this.startSlider();
    }

    goSlide(index: number, event?: Event) {
        event?.stopPropagation();
        this.slideIndex = index;
        this.startSlider();
    }

    get homeProducts(): any[] {
        return this.products.slice(0, 40);
    }

    payPrice(p: any): number {
        return p?.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
    }

    onAdd(e: Event, p: any) {
        e.preventDefault();
        e.stopPropagation();
        this.cartService.addItem(p, 1, {});
    }

    onFav(e: Event, p: any) {
        e.preventDefault();
        e.stopPropagation();
        const images = Array.isArray(p.images) ? p.images : [];
        this.favService.toggle({
            id: p.id, name: p.name, slug: p.slug,
            price: p.price, salePrice: p.salePrice || null, images
        });
    }

    submitHomeSearch() {
        const q = this.homeSearch.trim();
        if (!q) return;
        this.router.navigate(['/shop'], { queryParams: { search: q } });
    }

    openBanner(banner: any) {
        const url = banner?.redirectionUrl || '/shop';
        if (/^https?:/i.test(url)) {
            window.open(url, '_blank');
            return;
        }
        this.router.navigateByUrl(url);
    }

    scrollCats(dir: number) {
        const el = this.catTrack?.nativeElement;
        if (!el) return;
        const card = el.querySelector('.cat-tile') as HTMLElement | null;
        const step = (card?.offsetWidth || 108) + 18;
        el.scrollBy({ left: dir * step * 3, behavior: 'smooth' });
    }

    scrollReels(dir: number) {
        const el = this.reelsTrack?.nativeElement;
        if (!el) return;
        const card = el.querySelector('.reel-card') as HTMLElement | null;
        const step = (card?.offsetWidth || 340) + 20;
        el.scrollBy({ left: dir * step, behavior: 'smooth' });
    }

    openReel(reel: any) {
        this.activeReel = reel;
        if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
    }

    closeReel() {
        this.activeReel = null;
        if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
    }

    previewReel(event: Event, play: boolean) {
        const video = event.target as HTMLVideoElement;
        if (!video?.play) return;
        if (play) {
            const src = video.dataset['src'];
            if (src && video.getAttribute('src') !== src) video.src = src;
            video.play().catch(() => {});
        } else {
            video.pause();
            try { video.currentTime = 0; } catch { /* not ready */ }
        }
    }

    ngOnDestroy(): void {
        this.stopSlider();
        this.catSub?.unsubscribe();
        this.closeReel();
    }

    setActiveImg(id: number, idx: number) { this.activeImg[id] = idx; }

    qtyChange(id: number, delta: number) {
        this.qty[id] = Math.max(1, (this.qty[id] ?? 1) + delta);
    }

    selectVariant(id: number, vi: number, oi: number) {
        if (!this.selectedVariant[id]) this.selectedVariant[id] = {};
        this.selectedVariant[id][vi] = oi;
    }

    getSelectedOptions(p: any): { [k: string]: string } {
        const sel = this.selectedVariant[p.id] || {};
        const opts: { [k: string]: string } = {};
        (p.variants || []).forEach((v: any, vi: number) => {
            const opt = v.options?.[sel[vi] ?? 0];
            if (opt) opts[v.name] = opt.label;
        });
        return opts;
    }

    parseJson(val: any, fallback: any = null): any {
        if (!val) return fallback;
        if (typeof val !== 'string') return val;
        try { return JSON.parse(val); } catch { return fallback; }
    }

    goToProduct(slug: string) { this.router.navigate(['/product', slug]); }

    buyNow(e: Event, product: any, qty: number = 1, selectedOptions: { [k: string]: string } = {}) {
        e.stopPropagation();
        e.preventDefault();
        this.qcService.open(product, qty, selectedOptions);
    }

    getStars(rating: number): string[] {
        const stars: string[] = [];
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) stars.push('full');
            else if (rating >= i - 0.5) stars.push('half');
            else stars.push('empty');
        }
        return stars;
    }

    getDiscount(price: number, salePrice: number): number {
        return Math.round(((price - salePrice) / price) * 100);
    }

    @HostListener('window:resize')
    onResize() {
        const wasMobile = this.isMobile;
        this.checkDevice();
        if (wasMobile !== this.isMobile) {
            this.slideIndex = 0;
            this.startSlider();
        }
    }

    checkDevice() {
        if (isPlatformBrowser(this.platformId)) {
            this.isMobile = window.innerWidth <= 768;
        }
    }
}
