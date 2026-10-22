import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environment/environment';
import { SharedService } from './shared.service';
import { MetaPixelService } from './meta-pixel.service';

@Injectable({ providedIn: 'root' })
export class AppStoreService {

    // ── Categories ────────────────────────────────────────────────────────────
    private _categories$ = new BehaviorSubject<any[]>([]);
    categories$ = this._categories$.asObservable();

    get categories(): any[] { return this._categories$.getValue(); }

    // ── Category tree ─────────────────────────────────────────────────────────
    private _categoryTree$ = new BehaviorSubject<any[]>([]);
    categoryTree$ = this._categoryTree$.asObservable();

    get categoryTree(): any[] { return this._categoryTree$.getValue(); }

    // ── Loaded flags ──────────────────────────────────────────────────────────
    categoriesLoaded: boolean = false;

    constructor(private http: HttpClient, private sharedService: SharedService, private metaPixel: MetaPixelService) { }

    loadAll(): void {
        const base = environment.APIUrl;

        this.http.get<any>(`${base}siteconfig/getForUi`).pipe(catchError(() => of({ data: {} }))).subscribe((res) => {
            const config = res?.data || null;
            if (config) this._applySiteConfig(config);
        });

        this.http.get<any>(`${base}category/getPublicCategories`).pipe(catchError(() => of({ data: [] }))).subscribe((res) => {
            this._applyCategories(Array.isArray(res?.data) ? res.data : []);
        });
    }

    private _applyCategories(list: any[]) {
        this._categories$.next(list);
        this._categoryTree$.next(this.buildTree(list, null));
        this.categoriesLoaded = true;
    }

    private _applySiteConfig(config: any) {
        this.sharedService.siteConfig = config;
        if (config.siteName)     document.title = String(config.siteName);
        this.sharedService.applyTheme(config);
        if (config.icon)         this.setFavicon(config.icon);
        if (config.theme)        document.querySelector('body')?.classList.add(config.theme);
        if (config.metaPixelId)  this.metaPixel.init(config.metaPixelId, config.metaAccessToken || '');
    }

    buildTree(flat: any[], parentId: number | null): any[] {
        return flat
            .filter(c => (c.parentId ?? null) === parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            .map(c => ({ ...c, children: this.buildTree(flat, c.id) }));
    }

    getCategoryById(id: number): any {
        return this.categories.find(c => c.id === id) || null;
    }

    get rootCategories(): any[] {
        return this.categories.filter(c => !c.parentId);
    }

    getChildren(parentId: number): any[] {
        return this.categories.filter(c => c.parentId === parentId);
    }

    private setFavicon(href: string) {
        try {
            const head = document.head || document.getElementsByTagName('head')[0];
            if (!head) return;
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement('link');
                (link as HTMLLinkElement).rel = 'icon';
                head.appendChild(link);
            }
            (link as HTMLLinkElement).href = href;
        } catch {}
    }
}
