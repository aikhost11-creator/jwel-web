import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CustomerAuthService } from '../../shared/services/customer-auth.service';
import { SharedService } from '../../shared/services/shared.service';
import { MetaPixelService } from '../../shared/services/meta-pixel.service';
import { urlConstant } from '../../shared/constant/urlConst';

@Component({
    selector: 'app-order-success',
    standalone: false,
    templateUrl: './order-success.component.html',
    styleUrls: ['./order-success.component.scss']
})
export class OrderSuccessComponent implements OnInit {

    order: any = null;
    loading = true;
    confettiDone = false;
    isDuplicate = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        public authService: CustomerAuthService,
        public sharedService: SharedService,
        private metaPixel: MetaPixelService
    ) {}

    ngOnInit(): void {
        // ── PhonePe callback: ?txn=...&session=... (no :id param) ────────────
        const txn     = this.route.snapshot.queryParamMap.get('txn');
        const session = this.route.snapshot.queryParamMap.get('session');

        if (txn && session) {
            this.handlePhonePeCallback(txn, session);
            return;
        }

        // ── Normal flow: /order-success/:id ──────────────────────────────────
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.router.navigate(['/']); return; }

        this.isDuplicate = this.route.snapshot.queryParamMap.get('duplicate') === '1';
        this.fetchOrder(id);
    }

    // ── PhonePe callback handler ──────────────────────────────────────────────
    private handlePhonePeCallback(txn: string, session: string) {
        // Verify payment status with backend
        this.http.get<any>(urlConstant.PaymentSettingsAPI.phonePeVerify + txn).subscribe({
            next: verifyRes => {
                if (verifyRes.success) {
                    // Payment successful — create order from pending data
                    const pending = this.getPendingOrder(session);
                    if (pending) {
                        const payload = {
                            ...pending,
                            paymentMethod: 'phonepe',
                            paymentId: txn,
                            status: 'confirmed'
                        };
                        this.http.post<any>(urlConstant.OrderAPI.createOrder, payload).subscribe({
                            next: res => {
                                sessionStorage.removeItem('qc_pending');
                                if (res?.alreadyExists || res?.blocked) {
                                    this.isDuplicate = true;
                                    this.loading = false;
                                    this.order = res?.data || {
                                        orderNumber: 'EXISTING',
                                        status: 'confirmed',
                                        paymentMethod: 'phonepe',
                                        total: pending?.total || 0,
                                        _items: pending?.items || [],
                                        _address: pending?.deliveryAddress
                                    };
                                    if (this.order && !this.order._items) {
                                        this.order._items = this.tryParse(this.order.items, pending?.items || []);
                                        this.order._address = this.tryParse(this.order.deliveryAddress, pending?.deliveryAddress || null);
                                    }
                                    return;
                                }
                                this.router.navigate(['/order-success', res.data.id], { replaceUrl: true });
                            },
                            error: () => {
                                // Order create failed — still show success with txn info
                                this.loading = false;
                                this.order = { orderNumber: txn, status: 'confirmed', paymentMethod: 'phonepe', total: pending?.total || 0, _items: pending?.items || [], _address: pending?.deliveryAddress };
                            }
                        });
                    } else {
                        // No pending data — just show generic success
                        this.loading = false;
                        this.order = { orderNumber: txn, status: 'confirmed', paymentMethod: 'phonepe', total: 0, _items: [], _address: null };
                    }
                } else {
                    // Payment failed or pending
                    this.loading = false;
                    this.order = null;
                }
            },
            error: () => {
                // Verify API failed — try to create order anyway if pending data exists
                const pending = this.getPendingOrder(session);
                if (pending) {
                    const payload = { ...pending, paymentMethod: 'phonepe', paymentId: txn, status: 'confirmed' };
                    this.http.post<any>(urlConstant.OrderAPI.createOrder, payload).subscribe({
                        next: res => {
                            sessionStorage.removeItem('qc_pending');
                            if (res?.alreadyExists || res?.blocked) {
                                this.isDuplicate = true;
                                this.loading = false;
                                this.order = res?.data || { orderNumber: 'EXISTING', status: 'confirmed', paymentMethod: 'phonepe', total: pending?.total || 0, _items: pending?.items || [], _address: pending?.deliveryAddress };
                                return;
                            }
                            this.router.navigate(['/order-success', res.data.id], { replaceUrl: true });
                        },
                        error: () => { this.loading = false; }
                    });
                } else {
                    this.loading = false;
                }
            }
        });
    }

    private getPendingOrder(session: string): any | null {
        try {
            const raw = sessionStorage.getItem('qc_pending');
            if (!raw) return null;
            const data = JSON.parse(raw);
            // Validate session matches
            if (data.sessionId && data.sessionId !== session) return null;
            return data;
        } catch { return null; }
    }

    // ── Fetch order by id ─────────────────────────────────────────────────────
    private fetchOrder(id: string) {
        if (id === '0') {
            this.order = {
                id: 0,
                orderNumber: 'EXISTING',
                status: 'confirmed',
                total: 0,
                _items: [],
                _address: null
            };
            this.loading = false;
            return;
        }

        const headers: any = {};
        if (this.authService.token) {
            headers['Authorization'] = `Bearer ${this.authService.token}`;
        }


        this.http.get<any>(urlConstant.OrderAPI.getById + id,
            { headers: new HttpHeaders(headers) })
            .subscribe({
                next: res => {
                    this.order = res.data;
                    this.loading = false;
                    if (this.order) {
                        this.order._items   = this.tryParse(this.order.items, []);
                        this.order._address = this.tryParse(this.order.deliveryAddress, null);

                        // Fire Purchase pixel event
                        this.metaPixel.purchase({
                            orderId:  String(this.order.orderNumber || this.order.id),
                            value:    parseFloat(this.order.total) || 0,
                            currency: this.sharedService.siteConfig?.currency || 'INR',
                            items:    this.order._items,
                            email:    this.order.guestEmail || '',
                            phone:    this.order.contactPhone || ''
                        });
                    }
                },
                error: () => { this.loading = false; }
            });
    }

    tryParse(val: any, fallback: any): any {
        try { return typeof val === 'string' ? JSON.parse(val) : (val ?? fallback); }
        catch { return fallback; }
    }

    get currency(): string { return this.sharedService.siteConfig?.currency || '₹'; }

    getOptionEntries(opts: any): { key: string; value: string }[] {
        return Object.entries(opts || {}).map(([key, value]) => ({ key, value: value as string }));
    }
}
