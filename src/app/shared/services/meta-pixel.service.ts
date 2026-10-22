import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        _fbq: any;
    }
}

@Injectable({ providedIn: 'root' })
export class MetaPixelService {

    private initialized = false;
    private pixelId = '';
    private accessToken = '';

    private readonly CAPI_URL = 'https://graph.facebook.com/v19.0';

    constructor(private http: HttpClient) {}

    /** Call once after siteConfig is loaded */
    init(pixelId: string, accessToken = '') {
        this.pixelId = pixelId;
        this.accessToken = accessToken;
        if (!pixelId || this.initialized) return;
        this.loadScript(pixelId);
        this.initialized = true;
    }

    // ── Browser-side events ───────────────────────────────────────────────────

    pageView() {
        this.fbq('track', 'PageView');
    }

    viewContent(data: { contentId: string | number; contentName: string; value: number; currency: string }) {
        const eventId = this.makeEventId('ViewContent');
        const customData = {
            content_ids:  [String(data.contentId)],
            content_name: data.contentName,
            content_type: 'product',
            value:        data.value,
            currency:     'INR'
        };
        this.fbq('track', 'ViewContent', customData, { eventID: eventId });
        this.capiEvent('ViewContent', customData, {}, eventId);
    }

    /** Fire Purchase — call ONLY once per order, on order-success page */
    purchase(data: { orderId: string; value: number; currency: string; items: any[]; email?: string; phone?: string }) {
        // Deduplicate: don't fire twice for same order in same session
        const key = `px_purchase_${data.orderId}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');

        const eventId = this.makeEventId('Purchase');
        const customData = {
            order_id:     data.orderId,
            value:        data.value,
            currency:     'INR',   // Always ISO code, never symbol
            content_ids:  data.items.map((i: any) => String(i.id || i.productId || '')),
            content_type: 'product',
            num_items:    data.items.length
        };
        this.fbq('track', 'Purchase', customData, { eventID: eventId });
        this.capiEventAsync('Purchase', customData, { email: data.email, phone: data.phone }, eventId);
    }

    addToCart(data: { contentId: string | number; contentName: string; value: number; currency: string }) {
        const eventId = this.makeEventId('AddToCart');
        const customData = {
            content_ids:  [String(data.contentId)],
            content_name: data.contentName,
            content_type: 'product',
            value:        data.value,
            currency:     'INR'
        };
        this.fbq('track', 'AddToCart', customData, { eventID: eventId });
        this.capiEvent('AddToCart', customData, {}, eventId);
    }

    initiateCheckout(data: { value: number; currency: string; numItems: number; email?: string; phone?: string }) {
        const eventId = this.makeEventId('InitiateCheckout');
        const customData = {
            value:     data.value,
            currency:  'INR',
            num_items: data.numItems
        };
        this.fbq('track', 'InitiateCheckout', customData, { eventID: eventId });
        this.capiEventAsync('InitiateCheckout', customData, { email: data.email, phone: data.phone }, eventId);
    }

    // ── Conversions API (server-side) — sync version (no PII hashing) ─────────
    private capiEvent(eventName: string, customData: any, userData: { email?: string; phone?: string } = {}, eventId: string) {
        if (!this.pixelId || !this.accessToken) return;

        const payload = {
            data: [{
                event_name:       eventName,
                event_time:       Math.floor(Date.now() / 1000),
                event_id:         eventId,
                event_source_url: typeof window !== 'undefined' ? window.location.href : '',
                action_source:    'website',
                user_data: {
                    client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
                },
                custom_data: customData
            }]
        };

        this.http.post(
            `${this.CAPI_URL}/${this.pixelId}/events?access_token=${this.accessToken}`,
            payload
        ).subscribe({ error: () => {} });
    }

    // ── Conversions API — async version with PII hashing (for Purchase, InitiateCheckout) ──
    private async capiEventAsync(eventName: string, customData: any, userData: { email?: string; phone?: string } = {}, eventId: string) {
        if (!this.pixelId || !this.accessToken) return;

        const hashedEmail = userData.email ? await this.hashValue(userData.email.toLowerCase().trim()) : undefined;
        const hashedPhone = userData.phone ? await this.hashValue(userData.phone.replace(/\D/g, '')) : undefined;

        const payload = {
            data: [{
                event_name:       eventName,
                event_time:       Math.floor(Date.now() / 1000),
                event_id:         eventId,
                event_source_url: typeof window !== 'undefined' ? window.location.href : '',
                action_source:    'website',
                user_data: {
                    ...(hashedEmail ? { em: [hashedEmail] } : {}),
                    ...(hashedPhone ? { ph: [hashedPhone] } : {}),
                    client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
                },
                custom_data: customData
            }]
        };

        this.http.post(
            `${this.CAPI_URL}/${this.pixelId}/events?access_token=${this.accessToken}`,
            payload
        ).subscribe({ error: () => {} });
    }

    private makeEventId(eventName: string): string {
        return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    private async hashValue(value: string): Promise<string> {
        if (typeof window === 'undefined' || !window.crypto?.subtle) return value;
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private fbq(...args: any[]) {
        if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
            window.fbq(...args);
        }
    }

    private loadScript(pixelId: string) {
        if (typeof window === 'undefined') return;

        const script = document.createElement('script');
        script.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
        `;
        document.head.appendChild(script);

        const noscript = document.createElement('noscript');
        noscript.innerHTML = `<img height="1" width="1" style="display:none"
            src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
        document.head.appendChild(noscript);
    }
}
