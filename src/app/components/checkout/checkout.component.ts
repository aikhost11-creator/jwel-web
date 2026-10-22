import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CartService, CartItem } from '../../shared/services/cart.service';
import { CustomerAuthService } from '../../shared/services/customer-auth.service';
import { SharedService } from '../../shared/services/shared.service';
import { urlConstant } from '../../shared/constant/urlConst';

declare var Razorpay: any;

@Component({
    selector: 'app-checkout',
    standalone: false,
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {

    step: number = 1; // 1 = Delivery, 2 = Payment

    items: CartItem[] = [];
    private sub!: Subscription;

    deliveryCharge: number = 20;

    // Addresses
    addresses: any[] = [];
    selectedAddress: any = null;
    addrLoading: boolean = false;
    showAddressForm = false;
    addrSaving = false;
    newAddress = {
        firstName: '',
        lastName: '',
        line1: '',
        line2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'India',
        phone: '',
    };

    // Delivery date
    deliveryDates: { label: string; date: Date; dateStr: string }[] = [];
    selectedDate: string = '';

    // Contact
    contactPhone: string = '';

    // Order accordion
    orderAccordionOpen: boolean = false;
    parcelAccordionOpen: boolean = false;

    // Payment
    razorpayKeyId: string = '';
    isPaymentActive: boolean = false;
    isProcessing: boolean = false;

    constructor(
        public cartService: CartService,
        public authService: CustomerAuthService,
        public sharedService: SharedService,
        private http: HttpClient,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.sub = this.cartService.items$.subscribe(items => { this.items = items; });
        if (this.cartService.items.length === 0) {
            this.router.navigate(['/shop']);
            return;
        }
        this.buildDeliveryDates();
        if (this.authService.isLoggedIn) {
            this.loadAddresses();
            this.contactPhone = this.authService.customer?.mobile || '';
        } else {
            this.showAddressForm = true;
        }
        this.loadRazorpayKey();
    }

    ngOnDestroy(): void { this.sub?.unsubscribe(); }

    get currency(): string { return this.sharedService.siteConfig?.currency || '£'; }
    get subtotal(): number { return this.cartService.getTotal(); }
    get total(): number { return this.subtotal + this.deliveryCharge; }
    get itemCount(): number { return this.cartService.getCount(); }

    private get authHeaders(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${this.authService.token}` });
    }

    buildDeliveryDates(): void {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        this.deliveryDates = [];
        for (let i = 2; i <= 8; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const label = days[d.getDay()];
            const dateStr = d.toISOString().split('T')[0];
            this.deliveryDates.push({ label, date: d, dateStr });
        }
        this.selectedDate = this.deliveryDates[0]?.dateStr || '';
    }

    loadAddresses(): void {
        this.addrLoading = true;
        this.http.get<any>(urlConstant.CustomerAddressAPI.base, { headers: this.authHeaders })
            .subscribe(
                res => {
                    this.addresses = res.data || [];
                    this.selectedAddress = this.addresses.find(a => a.isDefault) || this.addresses[0] || null;
                    this.showAddressForm = this.addresses.length === 0;
                    this.addrLoading = false;
                },
                () => {
                    this.addrLoading = false;
                    this.showAddressForm = true;
                }
            );
    }

    openAddressForm(): void {
        const c = this.authService.customer;
        this.newAddress = {
            firstName: c?.firstName || '',
            lastName: c?.lastName || '',
            line1: '',
            line2: '',
            city: '',
            county: '',
            postcode: '',
            country: 'India',
            phone: this.contactPhone || c?.mobile || '',
        };
        this.showAddressForm = true;
    }

    saveAddress(): void {
        const a = this.newAddress;
        if (!a.firstName.trim() || !a.line1.trim() || !a.city.trim() || !a.postcode.trim()) {
            this.sharedService.showAlert(2, 'Please fill required address fields');
            return;
        }

        // Guest checkout — keep address locally (no customer account)
        if (!this.authService.isLoggedIn) {
            this.selectedAddress = { ...a };
            this.showAddressForm = false;
            return;
        }

        this.addrSaving = true;
        this.http.post<any>(urlConstant.CustomerAddressAPI.base, {
            ...a,
            isDefault: this.addresses.length === 0,
        }, { headers: this.authHeaders }).subscribe(
            res => {
                this.addrSaving = false;
                this.showAddressForm = false;
                this.loadAddresses();
                if (res?.data) this.selectedAddress = res.data;
            },
            () => {
                this.addrSaving = false;
                this.sharedService.showAlert(3, 'Could not save address');
            }
        );
    }

    loadRazorpayKey(): void {
        this.http.get<any>(urlConstant.PaymentSettingsAPI.getPublic).subscribe(
            res => {
                this.razorpayKeyId = res.keyId || '';
                this.isPaymentActive = !!res.isActive;
            },
            () => {}
        );
    }

    selectDate(dateStr: string): void { this.selectedDate = dateStr; }

    continueToPayment(): void {
        if (!this.contactPhone.trim()) return;
        this.step = 2;
        window.scrollTo(0, 0);
    }

    goBackToDelivery(): void { this.step = 1; }

    loadRazorpayScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof Razorpay !== 'undefined') { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Razorpay script failed to load'));
            document.body.appendChild(script);
        });
    }

    async payNow(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;
        try {
            await this.loadRazorpayScript();
            const amountPaise = Math.round(this.total * 100);
            const customer = this.authService.customer;
            const options = {
                key: this.razorpayKeyId,
                amount: amountPaise,
                currency: 'GBP',
                name: this.sharedService.siteConfig?.siteName || 'Store',
                description: `Order of ${this.itemCount} item(s)`,
                prefill: {
                    name: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
                    email: customer?.email || '',
                    contact: this.contactPhone
                },
                theme: { color: '#1c1c1c' },
                handler: (response: any) => {
                    this.onPaymentSuccess(response);
                },
                modal: {
                    ondismiss: () => { this.isProcessing = false; }
                }
            };
            const rzp = new Razorpay(options);
            rzp.open();
        } catch (err) {
            this.isProcessing = false;
            console.error('Razorpay error:', err);
        }
    }

    onPaymentSuccess(response: any): void {
        const customer = this.authService.customer;
        const payload: any = {
            items: this.items,
            subtotal: this.subtotal,
            deliveryCharge: this.deliveryCharge,
            total: this.total,
            deliveryAddress: this.selectedAddress,
            contactPhone: this.contactPhone,
            paymentMethod: 'razorpay',
            razorpayPaymentId: response.razorpay_payment_id || null,
            razorpayOrderId: response.razorpay_order_id || null,
            paymentId: response.razorpay_payment_id || null,
            status: 'confirmed'
        };

        if (customer?.id) {
            payload.customerId = customer.id;
        } else {
            payload.guestName = `${this.selectedAddress?.firstName || ''} ${this.selectedAddress?.lastName || ''}`.trim();
            payload.guestEmail = '';
        }

        const opts = customer?.id ? { headers: this.authHeaders } : {};
        this.http.post<any>(urlConstant.OrderAPI.createOrder, payload, opts)
            .subscribe(
                res => {
                    this.isProcessing = false;
                    if (res?.alreadyExists || res?.blocked) {
                        alert(res?.message || 'Your order is already created');
                        return;
                    }
                    this.cartService.clearCart();
                    this.router.navigate(['/order-success', res.data.id]);
                },
                err => {
                    this.isProcessing = false;
                    console.error('Order creation failed:', err);
                    alert(err?.error?.error || err?.error?.message || 'Order creation failed');
                }
            );
    }

    getOptionEntries(options: { [key: string]: string }): { key: string; value: string }[] {
        return Object.entries(options || {}).map(([key, value]) => ({ key, value }));
    }

    formatAddress(addr: any): string {
        if (!addr) return '';
        return [addr.firstName + ' ' + addr.lastName, addr.line1, addr.line2, addr.city, addr.county, addr.postcode, addr.country]
            .filter(Boolean).join(', ');
    }
}
