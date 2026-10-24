import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProductService } from '../../shared/services/product.service';
import { SharedService } from '../../shared/services/shared.service';
import { CartService } from '../../shared/services/cart.service';
import { QuickCheckoutService } from '../../shared/services/quick-checkout.service';
import { MetaPixelService } from '../../shared/services/meta-pixel.service';
import { SeoService } from '../../shared/services/seo.service';
import { ReelsService } from '../../shared/services/reels.service';

@Component({
    selector: 'app-product-detail',
    standalone: false,
    templateUrl: './product-detail.component.html',
    styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('thumbsTrack') thumbsTrack!: ElementRef<HTMLElement>;
    @ViewChild('promoReelFull') promoReelFull!: ElementRef<HTMLVideoElement>;
    @ViewChild('buyBtnRef') buyBtnRef!: ElementRef<HTMLElement>;
    @ViewChild('pdpReelsTrack') pdpReelsTrack?: ElementRef<HTMLElement>;

    product: any = null;
    isLoading = true;
    notFound = false;
    reels: any[] = [];
    activeReel: any = null;

    // Sticky bar visibility
    showStickyBar = false;
    private buyBtnObserver!: IntersectionObserver;

    // Gallery
    activeImageIdx = 0;

    // Variants
    selectedOptions: { [key: string]: string } = {};

    // Accordions
    accOpen: { [key: string]: boolean } = { desc: true };
    whyOpen: boolean[] = [];
    faqOpen: boolean[] = [];

    // Reviews
    reviews: any[] = [];
    reviewStats: any = null;
    reviewsLoading = false;
    reviewOffset = 0;
    reviewLimit = 9;
    reviewSort = 'newest';
    hasMoreReviews = false;
    showReviewForm = false;
    reviewForm = { reviewerName: '', rating: 5, title: '', body: '' };
    reviewSubmitting = false;

    // Cart
    addQty = 1;
    addedToBag = false;
    cartPanelOpen = false;

    // Offer timer
    offerTimer = '';
    saleClock = { d: '00', h: '00', m: '00', s: '00' };
    private timerInterval: any;

    shareOpen = false;
    linkCopied = false;
    lightboxOpen = false;
    related: any[] = [];

    // Promo Reel
    promoReelOpen = false;
    promoReelDismissed = false;

    // Size Guide
    sizeGuideOpen = false;

    // Viewing count (fake social proof)
    viewingCount = 0;

    // Variant validation
    showVariantError = false;
    get missingVariantName(): string {
        if (!this.product?.variants?.length) return '';
        for (const v of this.product.variants) {
            if (!this.selectedOptions[v.name]) return v.name;
        }
        return '';
    }

    private routeSub!: Subscription;

    constructor(
        private productService: ProductService,
        private route: ActivatedRoute,
        private router: Router,
        public sharedService: SharedService,
        public cartService: CartService,
        public qcService: QuickCheckoutService,
        private metaPixel: MetaPixelService,
        private sanitizer: DomSanitizer,
        private seo: SeoService,
        private reelsApi: ReelsService
    ) {}

    get safeDescription(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(this.product?.description || '');
    }

    ngOnInit(): void {
        this.routeSub = this.route.params.subscribe(p => this.loadProduct(p['slug']));
        this.startOfferTimer();
        this.viewingCount = Math.floor(Math.random() * 20) + 5;
        this.reelsApi.getActive().pipe(catchError(() => of({ data: [] }))).subscribe((res: any) => {
            this.reels = res?.data || [];
        });
    }

    scrollReels(dir: number) {
        const el = this.pdpReelsTrack?.nativeElement;
        if (!el) return;
        const card = el.querySelector('.pdp-reel-card') as HTMLElement | null;
        const step = (card?.offsetWidth || 280) + 18;
        el.scrollBy({ left: dir * step, behavior: 'smooth' });
    }

    openReel(reel: any) {
        this.activeReel = reel;
        document.body.style.overflow = 'hidden';
    }

    closeReel() {
        this.activeReel = null;
        document.body.style.overflow = '';
    }

    previewReel(event: Event, play: boolean) {
        const video = event.target as HTMLVideoElement;
        if (!video?.play) return;
        if (play) video.play().catch(() => {});
        else { video.pause(); video.currentTime = 0; }
    }

    ngAfterViewInit(): void {
        this.buyBtnObserver = new IntersectionObserver(
            ([entry]) => { this.showStickyBar = !entry.isIntersecting; },
            { threshold: 0 }
        );
    }

    private setupBuyBtnObserver(): void {
        if (!this.buyBtnObserver) return;
        setTimeout(() => {
            if (this.buyBtnRef?.nativeElement) {
                this.buyBtnObserver.disconnect();
                this.buyBtnObserver.observe(this.buyBtnRef.nativeElement);
            }
        }, 100);
    }

    ngOnDestroy(): void {
        this.routeSub?.unsubscribe();
        this.buyBtnObserver?.disconnect();
        clearInterval(this.timerInterval);
        document.body.style.overflow = '';
    }

    // ── Load product ──────────────────────────────────────────────────────────
    loadProduct(slug: string) {
        this.isLoading = true;
        this.notFound = false;
        this.product = null;
        this.reviews = [];
        this.activeImageIdx = 0;
        this.selectedOptions = {};
        this.accOpen = {};
        this.shareOpen = false;
        this.lightboxOpen = false;
        this.addQty = 1;
        this.related = [];

        this.productService.getProduct(slug).subscribe({
            next: (res: any) => {
                if (!res.data) { this.notFound = true; this.isLoading = false; return; }
                const d = res.data;
                d.images         = this.parseArr(d.images);
                d.variants       = this.parseArr(d.variants);
                d.benefits       = this.parseArr(d.benefits);
                d.whyLoveIt      = this.parseArr(d.whyLoveIt);
                d.keyIngredients = this.parseArr(d.keyIngredients);
                d.faqs           = this.parseArr(d.faqs);
                d.galleryMedia   = this.parseArr(d.galleryMedia);
                this.product = d;                this.isLoading = false;

                // Set page title + OG tags + JSON-LD schema
                this.seo.setProduct(d,
                    this.sharedService.siteConfig?.siteName || 'Store',
                    this.sharedService.siteConfig?.currency || '₹'
                );

                // Fire ViewContent pixel event
                this.metaPixel.viewContent({
                    contentId:   d.id,
                    contentName: d.name,
                    value:       parseFloat(d.salePrice || d.price) || 0,
                    currency:    this.sharedService.siteConfig?.currency || 'INR'
                });

                // Default select first option of each variant
                (d.variants || []).forEach((v: any) => {
                    if (v.options?.length) this.selectedOptions[v.name] = v.options[0].label;
                });

                this.whyOpen = new Array(d.whyLoveIt?.length || 0).fill(false);
                if (this.whyOpen.length) this.whyOpen[0] = true;
                this.faqOpen = new Array(d.faqs?.length || 0).fill(false);

                this.loadReviews();
                this.loadRelated();
                this.setupBuyBtnObserver();
            },
            error: () => { this.notFound = true; this.isLoading = false; }
        });
    }

    parseArr(val: any): any[] {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val); } catch { return []; }
    }

    // ── Gallery ───────────────────────────────────────────────────────────────
    setActiveImage(i: number) { this.activeImageIdx = i; }
    prevImage() {
        const t = this.slides.length;
        if (!t) return;
        this.activeImageIdx = (this.activeImageIdx - 1 + t) % t;
    }
    nextImage() {
        const t = this.slides.length;
        if (!t) return;
        this.activeImageIdx = (this.activeImageIdx + 1) % t;
    }
    scrollThumbs(dir: -1 | 1) {
        const el = this.thumbsTrack?.nativeElement;
        if (el) el.scrollBy({ top: dir * 90, behavior: 'smooth' });
    }

    // ── Mobile swipe ──────────────────────────────────────────────────────────
    private touchStartX = 0;
    onMobTouchStart(e: TouchEvent) { this.touchStartX = e.touches[0].clientX; }
    onMobTouchEnd(e: TouchEvent) {
        const diff = this.touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) { diff > 0 ? this.nextImage() : this.prevImage(); }
    }

    // ── Variants ──────────────────────────────────────────────────────────────
    selectVariant(variantName: string, opt: any) {
        this.selectedOptions[variantName] = opt.label;
    }

    // ── Accordions ────────────────────────────────────────────────────────────
    toggleAcc(key: string) { this.accOpen[key] = !this.accOpen[key]; }
    toggleWhy(i: number)   { this.whyOpen[i] = !this.whyOpen[i]; }
    toggleFaq(i: number)   { this.faqOpen[i] = !this.faqOpen[i]; }

    // ── Cart ──────────────────────────────────────────────────────────────────
    addToBag() {
        if (!this.product) return;
        this.cartService.addItem(this.product, this.addQty, { ...this.selectedOptions });
        this.addedToBag = true;
        setTimeout(() => { this.addedToBag = false; }, 2000);
    }

    addToBagAndOpenCart() {
        if (!this.product) return;
        this.cartService.addItem(this.product, this.addQty, { ...this.selectedOptions });
        this.addedToBag = true;
        setTimeout(() => { this.addedToBag = false; }, 2000);
        this.openCartPanel();
    }

    openCartPanel() {
        this.cartPanelOpen = true;
        document.body.style.overflow = 'hidden';
    }

    closeCartPanel() {
        this.cartPanelOpen = false;
        document.body.style.overflow = '';
    }

    buyNow() {
        if (!this.product) return;
        // Validate all variants are selected
        if (this.missingVariantName) {
            this.showVariantError = true;
            setTimeout(() => { this.showVariantError = false; }, 2500);
            // Scroll to variant selector
            const el = document.querySelector('.pdp-variants-block');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        this.showVariantError = false;
        this.qcService.open(this.product, this.addQty, { ...this.selectedOptions });
    }

    goToCheckout() {
        this.closeCartPanel();
        this.router.navigate(['/checkout']);
    }

    @HostListener('document:keydown.escape')
    onEsc() {
        if (this.lightboxOpen) { this.closeLightbox(); return; }
        if (this.sizeGuideOpen) { this.closeSizeGuide(); return; }
        if (this.promoReelOpen) { this.closePromoReel(); return; }
        this.closeCartPanel();
    }

    decrementAddQty() { if (this.addQty > 1) this.addQty--; }
    incrementAddQty() { this.addQty++; }

    // ── Reviews ───────────────────────────────────────────────────────────────
    loadReviews(append = false) {
        if (!this.product?.id) return;
        this.reviewsLoading = true;
        this.productService.getReviews(this.product.id, this.reviewLimit, this.reviewOffset, this.reviewSort).subscribe({
            next: (res: any) => {
                const newR = res.data || [];
                this.reviews = append ? [...this.reviews, ...newR] : newR;
                this.reviewStats = res.stats;
                this.reviewOffset += newR.length;
                this.hasMoreReviews = this.reviews.length < (res.stats?.totalCount || 0);
                this.reviewsLoading = false;
            },
            error: () => { this.reviewsLoading = false; }
        });
    }

    loadMoreReviews() { this.loadReviews(true); }

    changeReviewSort(sort: string) {
        this.reviewSort = sort;
        this.reviewOffset = 0;
        this.reviews = [];
        this.loadReviews();
    }

    submitReview() {
        if (!this.reviewForm.reviewerName.trim() || !this.reviewForm.body.trim()) return;
        this.reviewSubmitting = true;
        this.productService.addReview(this.product.id, this.reviewForm).subscribe({
            next: () => {
                this.reviewSubmitting = false;
                this.showReviewForm = false;
                this.reviewForm = { reviewerName: '', rating: 5, title: '', body: '' };
                this.reviewOffset = 0;
                this.reviews = [];
                this.loadReviews();
            },
            error: () => { this.reviewSubmitting = false; }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    getStarArr(rating: number): string[] {
        const arr: string[] = [];
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) arr.push('full');
            else if (rating >= i - 0.5) arr.push('half');
            else arr.push('empty');
        }
        return arr;
    }

    getDiscount(price: number, salePrice: number): number {
        return Math.round(((price - salePrice) / price) * 100);
    }

    getStarPercent(star: number): number {
        const total = this.reviewStats?.totalCount || 0;
        if (!total) return 0;
        return Math.round(((this.reviewStats?.[`star${star}`] || 0) / total) * 100);
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    get slides(): Array<{ type: 'image' | 'video'; url: string; poster?: string }> {
        if (!this.product) return [];
        const out: Array<{ type: 'image' | 'video'; url: string; poster?: string }> = [];
        for (const img of this.product.images || []) {
            if (img) out.push({ type: 'image', url: img });
        }
        for (const media of this.product.galleryMedia || []) {
            if (!media?.url) continue;
            if (media.type === 'video') out.push({ type: 'video', url: media.url, poster: media.thumbnail || '' });
            else if (!out.some(slide => slide.url === media.url)) out.push({ type: 'image', url: media.url });
        }
        return out;
    }

    get activeSlide() {
        return this.slides[this.activeImageIdx] || null;
    }

    get orderedVariants(): any[] {
        const list = this.product?.variants || [];
        const rank = (name: string) => this.isColorVariant(name) ? 0 : this.isSizeVariant(name) ? 1 : 2;
        return [...list].sort((a, b) => rank(a.name) - rank(b.name));
    }

    get specRows(): Array<{ title: string; text: string }> {
        const product = this.product;
        if (!product) return [];
        if (product.keyIngredients?.length) return this.asRows(product.keyIngredients);
        if (product.benefits?.length) return this.asRows(product.benefits);
        return [];
    }

    get careRows(): Array<{ title: string; text: string }> {
        const items = this.product?.whyLoveIt || [];
        if (!items.length) return [];
        if (JSON.stringify(items) === JSON.stringify(this.product?.benefits || [])) return [];
        return this.asRows(items);
    }

    get hasComparePrice(): boolean {
        const sale = Number(this.product?.salePrice);
        const price = Number(this.product?.price);
        return Number.isFinite(sale) && sale > 0 && sale < price;
    }

    get currentPrice(): number {
        return this.hasComparePrice ? Number(this.product.salePrice) : Number(this.product?.price);
    }

    isColorVariant(name: string): boolean {
        return /colou?r|metal|finish/i.test(name || '');
    }

    isSizeVariant(name: string): boolean {
        return /size/i.test(name || '');
    }

    swatchBackground(opt: any): string {
        const value = String(opt?.value || '').trim();
        if (/^(#|rgb|hsl)/i.test(value)) return value;
        const key = String(opt?.label || '').toLowerCase();
        const map: Record<string, string> = {
            gold: '#d4af37', 'yellow gold': '#e1c16e', 'rose gold': '#b76e79',
            'white gold': '#eceae6', silver: '#c0c0c0', platinum: '#e5e4e2',
            black: '#111111', white: '#f4f4f4', red: '#b42318', blue: '#1d4e89',
            navy: '#1b2a4a', green: '#1f6b3a', pink: '#e7a3b5', brown: '#6b4423',
            beige: '#d8c3a5'
        };
        return map[key] || '#d9d9d9';
    }

    money(value: any): string {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return '';
        const currency = this.sharedService.currency || '₹';
        return currency + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    cardImage(item: any): string {
        return this.parseArr(item?.images)[0] || '';
    }

    private asRows(list: any[]): Array<{ title: string; text: string }> {
        return (list || []).map(item => {
            if (typeof item === 'string') return { title: item, text: '' };
            return {
                title: item?.name || item?.title || '',
                text: item?.description || item?.text || ''
            };
        }).filter(row => row.title || row.text);
    }

    private loadRelated() {
        if (!this.product?.categoryId || !this.product?.id) return;
        this.productService.getRelated(this.product.categoryId, this.product.id, 8)
            .pipe(catchError(() => of({ data: [] })))
            .subscribe((res: any) => { this.related = res?.data || []; });
    }

    toggleShare() { this.shareOpen = !this.shareOpen; }

    copyLink() {
        const url = window.location.href;
        navigator.clipboard?.writeText(url).then(() => {
            this.linkCopied = true;
            setTimeout(() => { this.linkCopied = false; }, 1400);
        }).catch(() => {});
    }

    shareTo(network: 'facebook' | 'twitter' | 'pinterest') {
        const url = encodeURIComponent(window.location.href);
        const links = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            twitter: `https://twitter.com/intent/tweet?url=${url}`,
            pinterest: `https://pinterest.com/pin/create/button/?url=${url}`
        };
        window.open(links[network], '_blank', 'noopener,width=640,height=520');
    }

    openLightbox() {
        if (this.activeSlide?.type !== 'image') return;
        this.lightboxOpen = true;
        document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
        this.lightboxOpen = false;
        if (!this.cartPanelOpen && !this.sizeGuideOpen && !this.activeReel) document.body.style.overflow = '';
    }

    // ── Reel play/pause on hover ──────────────────────────────────────────────
    playReel(i: number) {
        const v = document.getElementById('reel-' + i) as HTMLVideoElement;
        if (v) v.play().catch(() => {});
    }

    pauseReel(i: number) {
        const v = document.getElementById('reel-' + i) as HTMLVideoElement;
        if (v) v.pause();
    }

    // ── Promo Reel ────────────────────────────────────────────────────────────
    openPromoReel() {
        this.promoReelOpen = true;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            const v = this.promoReelFull?.nativeElement;
            if (v) { v.currentTime = 0; v.play().catch(() => {}); }
        }, 100);
    }

    closePromoReel() {
        this.promoReelOpen = false;
        document.body.style.overflow = '';
        const v = this.promoReelFull?.nativeElement;
        if (v) v.pause();
    }

    dismissPromoReel(e: Event) {
        e.stopPropagation();
        this.promoReelDismissed = true;
    }

    // ── Size Guide ────────────────────────────────────────────────────────────
    openSizeGuide() {
        this.sizeGuideOpen = true;
        document.body.style.overflow = 'hidden';
    }

    closeSizeGuide() {
        this.sizeGuideOpen = false;
        document.body.style.overflow = '';
    }

    // ── Gallery ───────────────────────────────────────────────────────────────
    openGalleryItem(i: number) {
        const m = this.product?.galleryMedia?.[i];
        if (m?.type === 'image') window.open(m.url, '_blank');
    }

    playGalleryVideo(e: Event) {
        const v = (e.target as HTMLVideoElement);
        if (v) v.play().catch(() => {});
    }

    pauseGalleryVideo(e: Event) {
        const v = (e.target as HTMLVideoElement);
        if (v) v.pause();
    }

    // ── Offer timer ───────────────────────────────────────────────────────────
    startOfferTimer() {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const pad = (n: number) => String(n).padStart(2, '0');
        const tick = () => {
            const diff = Math.max(0, end.getTime() - Date.now());
            this.saleClock = {
                d: pad(Math.floor(diff / 86400000)),
                h: pad(Math.floor((diff % 86400000) / 3600000)),
                m: pad(Math.floor((diff % 3600000) / 60000)),
                s: pad(Math.floor((diff % 60000) / 1000))
            };
        };
        tick();
        this.timerInterval = setInterval(tick, 1000);
    }
}
