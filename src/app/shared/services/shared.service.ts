import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DOCUMENT } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class SharedService {
    isSidebarOpen = true;
    isSidebarSlim = false;

    siteConfig: any;
    userData: any;

    get currency(): string {
        return this.siteConfig?.currency || '£';
    }

    deviceWidth: number;
    deviceHeight: number;

    currentTheme: 'light' | 'dark' = 'light';

    constructor(
        private router: Router,
        private toastr: ToastrService,
        @Inject(DOCUMENT) private doc: Document
    ) {
        if (localStorage.getItem('admin_data')) {
            this.userData = JSON.parse(atob(localStorage.getItem('admin_data')!));
        }
    }

    logout() {
        localStorage.removeItem('admin_data');
        localStorage.clear();
        this.router.navigate(['/']);
    }

    showAlert(type: number, title: string, message?: string) {
        const opts = { enableHtml: true, progressBar: true, positionClass: 'toast-top-right' as const };
        if (type === 1) this.toastr.success(title, message || '', opts);
        else if (type === 2) this.toastr.warning(title, message || '', opts);
        else if (type === 3) this.toastr.error(title, message || '', opts);
        else if (type === 4) this.toastr.info(title, message || '', opts);
    }

    openURL(url: string) {
        window.open(url, '_blank');
    }

    setPrimaryColor(color: string) {
        this.applyTheme({ ...(this.siteConfig || {}), primaryColor: color });
    }

    applyTheme(config: any) {
        if (!config || !this.doc?.documentElement) return;
        const root = this.doc.documentElement;
        const primary = config.primaryColor || '#1c1410';
        const accent = config.accentColor || '#c4a265';
        const headingFont = config.headingFont || 'Cormorant Garamond';
        const bodyFont = config.bodyFont || 'Outfit';
        const set = (name: string, value: string) => root.style.setProperty(name, value);

        set('--primary', primary);
        set('--primary-dark', this.shadeColor(primary, -18));
        set('--primary-bg', this.shadeColor(accent, 55));
        set('--accent', accent);
        set('--secondary', config.secondaryColor || '#3d2b1f');
        set('--page-bg', config.backgroundColor || '#faf7f2');
        set('--heading-font', config.headingColor || '#1c1410');
        set('--normal-font', config.textColor || '#6b5e52');
        set('--font-heading', `"${headingFont}", serif`);
        set('--font-body', `"${bodyFont}", sans-serif`);
        this.doc.body.style.background = config.backgroundColor || '#faf7f2';
        this.doc.body.style.color = config.textColor || '#6b5e52';
        this.doc.body.style.fontFamily = `"${bodyFont}", sans-serif`;
        this.loadFonts(headingFont, bodyFont);
    }

    private loadFonts(heading: string, body: string) {
        const id = 'theme-fonts';
        let link = this.doc.getElementById(id) as HTMLLinkElement | null;
        if (!link) {
            link = this.doc.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            this.doc.head.appendChild(link);
        }
        const families = [heading, body]
            .map((font) => `family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
            .join('&');
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    }

    private shadeColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + percent));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
        const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
        return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    }
}
