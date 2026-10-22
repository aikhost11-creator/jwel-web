import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {

    constructor(private title: Title, private meta: Meta) {}

    setDefault(siteName: string) {
        this.title.setTitle(siteName);
        this.updateMeta('og:title', siteName);
        this.updateMeta('og:site_name', siteName);
        this.updateMeta('twitter:title', siteName);
    }

    setProduct(product: any, siteName: string, currency: string) {
        const price    = product.salePrice || product.price || 0;
        const image    = product.images?.[0] || '';
        const pageTitle = `${product.name} — ${currency}${price} | ${siteName}`;
        const desc     = product.shortDescription
            || `Buy ${product.name} at ${currency}${price}. Free Shipping. Cash on Delivery available across India.`;

        this.title.setTitle(pageTitle);

        // Standard meta
        this.updateMeta('description', desc);

        // Open Graph
        this.updateMeta('og:title',       pageTitle);
        this.updateMeta('og:description', desc);
        this.updateMeta('og:image',       image);
        this.updateMeta('og:type',        'product');
        this.updateMeta('og:url',         typeof window !== 'undefined' ? window.location.href : '');
        this.updateMeta('product:price:amount',   String(price));
        this.updateMeta('product:price:currency', 'INR');

        // Twitter
        this.updateMeta('twitter:title',       pageTitle);
        this.updateMeta('twitter:description', desc);
        this.updateMeta('twitter:image',       image);
        this.updateMeta('twitter:card',        'summary_large_image');

        // JSON-LD schema
        this.setProductSchema(product, siteName, currency);
    }

    setPage(pageTitle: string, siteName: string, desc = '') {
        const full = `${pageTitle} | ${siteName}`;
        this.title.setTitle(full);
        this.updateMeta('og:title', full);
        this.updateMeta('twitter:title', full);
        if (desc) {
            this.updateMeta('description', desc);
            this.updateMeta('og:description', desc);
        }
        this.removeSchema();
    }

    private setProductSchema(product: any, siteName: string, currency: string) {
        this.removeSchema();
        const price    = product.salePrice || product.price || 0;
        const origPrice = product.price || price;
        const image    = product.images?.[0] || '';

        const schema: any = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name:        product.name,
            description: product.shortDescription || product.name,
            image:       product.images || [image],
            sku:         product.sku || String(product.id),
            brand: {
                '@type': 'Brand',
                name: siteName
            },
            offers: {
                '@type':         'Offer',
                url:             typeof window !== 'undefined' ? window.location.href : '',
                priceCurrency:   'INR',
                price:           price,
                priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                availability:    'https://schema.org/InStock',
                seller: { '@type': 'Organization', name: siteName }
            }
        };

        // Add original price if on sale
        if (product.salePrice && product.salePrice < origPrice) {
            schema.offers.highPrice = origPrice;
            schema.offers.lowPrice  = price;
        }

        // Add aggregate rating if reviews exist
        if (product.avgRating > 0 && product.reviewCount > 0) {
            schema.aggregateRating = {
                '@type':       'AggregateRating',
                ratingValue:   product.avgRating.toFixed(1),
                reviewCount:   product.reviewCount,
                bestRating:    '5',
                worstRating:   '1'
            };
        }

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id   = 'product-schema';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    private removeSchema() {
        const existing = document.getElementById('product-schema');
        if (existing) existing.remove();
    }

    private updateMeta(name: string, content: string) {
        // Handle both name= and property= attributes
        const isProperty = name.startsWith('og:') || name.startsWith('product:') || name.startsWith('twitter:');
        if (isProperty) {
            const el = document.querySelector(`meta[property="${name}"]`);
            if (el) { el.setAttribute('content', content); }
            else    { this.meta.addTag({ property: name, content }); }
        } else {
            this.meta.updateTag({ name, content });
        }
    }
}
