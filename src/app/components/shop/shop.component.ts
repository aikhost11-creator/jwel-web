import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { ProductService } from '../../shared/services/product.service';
import { AppStoreService } from '../../shared/services/app-store.service';
import { SharedService } from '../../shared/services/shared.service';
import { CartService } from '../../shared/services/cart.service';
import { FavouritesService } from '../../shared/services/favourites.service';

@Component({
    selector: 'app-shop',
    standalone: false,
    templateUrl: './shop.component.html',
    styleUrl: './shop.component.scss'
})
export class ShopComponent implements OnInit, OnDestroy {

    products: any[] = [];
    totalCount = 0;
    isLoading = false;
    isInitialLoad = true;
    hasMore = true;

    readonly LIMIT = 20;
    offset = 0;

    // ── Filters ───────────────────────────────────────────────────────────────
    selectedCategoryId: number | null = null;
    selectedSort = 'newest';
    newIn = false;
    searchTxt = '';
    minPrice: number | null = null;
    maxPrice: number | null = null;
    tempMin: number | null = null;
    tempMax: number | null = null;

    // ── UI state ──────────────────────────────────────────────────────────────
    openDropdown: string | null = null;   // desktop dropdown
    showMobileFilter = false;             // mobile filter panel
    showMobileSort = false;               // mobile sort dropdown
    showMoreFilters = false;              // MORE/LESS row

    // ── Meta ──────────────────────────────────────────────────────────────────
    pageTitle = 'All Products';
    allCategories: any[] = [];

    sortOptions = [
        { value: 'newest',     label: 'Most Relevant' },
        { value: 'popular',    label: 'Most Popular' },
        { value: 'price_asc',  label: 'Price: Low – High' },
        { value: 'price_desc', label: 'Price: High – Low' },
        { value: 'rating',     label: 'Top Rated' },
    ];

    private routeSub!: Subscription;

    constructor(
        private productService: ProductService,
        private route: ActivatedRoute,
        private router: Router,
        public appStore: AppStoreService,
        public sharedService: SharedService,
        public cartService: CartService,
        public favService: FavouritesService
    ) {}

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

    ngOnInit(): void {
        if (this.appStore.categories.length) this.allCategories = [...this.appStore.categories];
        this.appStore.categories$.subscribe(c => { if (c.length) this.allCategories = [...c]; });

        // Sync from URL
        this.routeSub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, p]) => {
            const fromPath = params.get('id');
            this.selectedCategoryId = fromPath ? +fromPath : (p.get('categoryId') ? +p.get('categoryId')! : null);
            this.selectedSort       = p.get('sort') || 'newest';
            this.newIn              = p.get('newIn') === 'true';
            this.minPrice           = p.get('minPrice') ? +p.get('minPrice')! : null;
            this.maxPrice           = p.get('maxPrice') ? +p.get('maxPrice')! : null;
            this.searchTxt          = p.get('search') || '';
            this.tempMin = this.minPrice;
            this.tempMax = this.maxPrice;
            this.setPageTitle();
            this.resetAndLoad();
        });
    }

    ngOnDestroy(): void { this.routeSub?.unsubscribe(); }

    // ── Close dropdowns on outside click ─────────────────────────────────────
    @HostListener('document:click')
    onDocClick() {
        this.openDropdown = null;
        this.showMobileSort = false;
    }

    // ── Dropdown toggle ───────────────────────────────────────────────────────
    toggleDd(name: string, e: Event) {
        e.stopPropagation();
        this.openDropdown = this.openDropdown === name ? null : name;
    }

    stopProp(e: Event) { e.stopPropagation(); }

    // ── Apply filters → URL ───────────────────────────────────────────────────
    applyFilters() {
        const qp: any = {};
        if (this.selectedSort !== 'newest') qp['sort'] = this.selectedSort;
        if (this.newIn)              qp['newIn']      = 'true';
        if (this.minPrice)           qp['minPrice']   = this.minPrice;
        if (this.maxPrice)           qp['maxPrice']   = this.maxPrice;
        const commands = this.selectedCategoryId ? ['/category', this.selectedCategoryId] : ['/shop'];
        const search = this.route.snapshot.queryParamMap.get('search');
        if (search) qp['search'] = search;
        this.router.navigate(commands, { queryParams: qp });
        this.openDropdown = null;
        this.showMobileFilter = false;
    }

    selectCategory(id: number | null) {
        this.selectedCategoryId = id;
        this.applyFilters();
    }

    selectSort(val: string) {
        this.selectedSort = val;
        this.showMobileSort = false;
        this.applyFilters();
    }

    toggleNewIn() {
        this.newIn = !this.newIn;
        this.applyFilters();
    }

    applyPrice() {
        this.minPrice = this.tempMin || null;
        this.maxPrice = this.tempMax || null;
        this.applyFilters();
    }

    clearPrice() {
        this.tempMin = null; this.tempMax = null;
        this.minPrice = null; this.maxPrice = null;
        this.applyFilters();
    }

    clearAllFilters() {
        this.selectedCategoryId = null;
        this.selectedSort = 'newest';
        this.newIn = false;
        this.minPrice = null; this.maxPrice = null;
        this.tempMin = null; this.tempMax = null;
        this.router.navigate(['/shop']);
        this.showMobileFilter = false;
    }

    // ── Mobile filter panel ───────────────────────────────────────────────────
    openMobileFilter(e: Event) { e.stopPropagation(); this.showMobileFilter = true; }
    closeMobileFilter() { this.showMobileFilter = false; }

    openMobileSort(e: Event) { e.stopPropagation(); this.showMobileSort = !this.showMobileSort; }

    // ── Helpers ───────────────────────────────────────────────────────────────
    get hasActiveFilters(): boolean {
        return !!(this.selectedCategoryId || this.minPrice || this.maxPrice || this.newIn);
    }

    get activeFilterCount(): number {
        let n = 0;
        if (this.selectedCategoryId) n++;
        if (this.minPrice || this.maxPrice) n++;
        if (this.newIn) n++;
        return n;
    }

    get activeSortLabel(): string {
        return this.sortOptions.find(s => s.value === this.selectedSort)?.label || 'Sort';
    }

    getCategoryName(id: number | null): string {
        return this.allCategories.find(c => c.id === id)?.name || '';
    }

    setPageTitle() {
        if (this.searchTxt) this.pageTitle = 'Search';
        else if (this.selectedCategoryId) this.pageTitle = this.getCategoryName(this.selectedCategoryId) || 'Collection';
        else this.pageTitle = 'The Collection';
    }

    get childCategories(): any[] {
        if (this.selectedCategoryId) {
            return this.allCategories.filter(c => Number(c.parentId) === Number(this.selectedCategoryId));
        }
        return this.allCategories.filter(c => !c.parentId);
    }

    // ── Load products ─────────────────────────────────────────────────────────
    resetAndLoad() {
        this.products = [];
        this.offset = 0;
        this.hasMore = true;
        this.isInitialLoad = true;
        this.loadMore();
    }

    loadMore() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;

        const params: any = { limit: this.LIMIT, offset: this.offset, sort: this.selectedSort };
        if (this.selectedCategoryId) params.categoryId = this.selectedCategoryId;
        if (this.searchTxt)          params.search     = this.searchTxt;
        if (this.minPrice)           params.minPrice   = this.minPrice;
        if (this.maxPrice)           params.maxPrice   = this.maxPrice;

        this.productService.getProducts(params).subscribe(
            (res: any) => {
                const items = res.data || [];
                this.products = [...this.products, ...items];
                this.totalCount = res.totalCount || 0;
                this.offset += items.length;
                this.hasMore = this.products.length < this.totalCount;
                this.isLoading = false;
                this.isInitialLoad = false;
            },
            () => { this.isLoading = false; this.isInitialLoad = false; }
        );
    }

    @HostListener('window:scroll')
    onScroll() {
        // Infinite scroll disabled — using Load More button instead
    }

    get skeletonArr(): number[] { return Array(this.LIMIT).fill(0); }
    getFirstImage(images: string[]): string { return images?.[0] || ''; }
}
