import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../services/shared.service';

interface FooterLink {
  label: string;
  url: string;
  icon: 'home' | 'shop' | 'about' | 'faq';
}

interface PolicyPage {
  slug: string;
  label: string;
  icon: 'shipping' | 'return' | 'privacy' | 'terms';
  desc: string;
}

interface TrustBadge {
  icon: 'shipping' | 'cod' | 'secure' | 'returns';
  label: string;
  sub: string;
}

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit {

  currentYear = new Date().getFullYear();
  newsletterEmail = '';
  openSection: string | null = 'policies';

  constructor(public sharedService: SharedService) {}

  /** Same logo path as header; prefer API whiteLogo on dark footer */
  get logoUrl(): string {
    const c = this.siteConfig;
    return c?.whiteLogo || c?.logo || 'assets/img/default/logo.png';
  }

  get siteName(): string {
    return this.sharedService.siteConfig?.siteName || this.displayDomain;
  }

  get siteConfig(): any {
    return this.sharedService.siteConfig || {};
  }

  get displayDomain(): string {
    const cfg = this.siteConfig;
    if (cfg?.clientUrl) {
      const raw = String(cfg.clientUrl).trim();
      try {
        const url = raw.startsWith('http') ? raw : `https://${raw}`;
        return new URL(url).hostname.replace(/^www\./i, '');
      } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
      }
    }
    if (cfg?.siteName) return String(cfg.siteName);
    if (typeof window !== 'undefined') {
      return window.location.hostname.replace(/^www\./i, '');
    }
    return 'Store';
  }

  get contactEmail(): string {
    return this.siteConfig?.email || '';
  }

  get contactPhone(): string {
    return this.siteConfig?.mobile || '';
  }

  get hasSocial(): boolean {
    const c = this.siteConfig;
    return !!(c?.instagramURL || c?.facebookURL || c?.twitterURL || c?.linkedInURL || c?.youtubeURL);
  }

  subscribeNewsletter() {
    const email = this.newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.sharedService.showAlert(2, 'Please enter a valid email address');
      return;
    }
    this.sharedService.showAlert(1, 'Thanks for subscribing!');
    this.newsletterEmail = '';
  }

  toggleSection(id: string) {
    this.openSection = this.openSection === id ? null : id;
  }

  isOpen(id: string): boolean {
    return this.openSection === id;
  }

  policyPages: PolicyPage[] = [
    { slug: 'shipping-policy', label: 'Shipping Policy', icon: 'shipping', desc: 'Delivery times, charges & tracking' },
    { slug: 'return-refund', label: 'Return & Refund', icon: 'return', desc: 'Returns, refunds & replacements' },
    { slug: 'privacy-policy', label: 'Privacy Policy', icon: 'privacy', desc: 'How we protect your data' },
    { slug: 'terms-conditions', label: 'Terms & Conditions', icon: 'terms', desc: 'Rules for using our store' },
  ];

  shopLinks: FooterLink[] = [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Shop All', url: '/shop', icon: 'shop' },
    { label: 'About Us', url: '/about-us', icon: 'about' },
    { label: 'FAQs', url: '/faqs', icon: 'faq' },
  ];

  trustBadges: TrustBadge[] = [
    { icon: 'shipping', label: 'Insured delivery', sub: 'Packed with care' },
    { icon: 'cod', label: 'Quick checkout', sub: 'Pay your way' },
    { icon: 'secure', label: 'Certified metals', sub: 'Hallmarked pieces' },
    { icon: 'returns', label: 'Easy returns', sub: 'Within 7 days' },
  ];

  mobileColumns: { id: string; heading: string; links: { label: string; url: string }[] }[] = [];

  ngOnInit() {
    this.mobileColumns = [
      { id: 'shop', heading: 'Shop', links: this.shopLinks.map(l => ({ label: l.label, url: l.url })) },
      {
        id: 'policies',
        heading: 'Policies & Legal',
        links: this.policyPages.map(p => ({ label: p.label, url: '/' + p.slug })),
      },
    ];
  }
}
