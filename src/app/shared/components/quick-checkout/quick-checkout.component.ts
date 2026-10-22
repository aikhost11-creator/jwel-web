import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { QuickCheckoutService } from '../../services/quick-checkout.service';
import { SharedService } from '../../services/shared.service';
import { MetaPixelService } from '../../services/meta-pixel.service';
import { urlConstant } from '../../constant/urlConst';

declare var Razorpay: any;

@Component({
    selector: 'app-quick-checkout',
    standalone: false,
    templateUrl: './quick-checkout.component.html',
    styleUrl: './quick-checkout.component.scss'
})
export class QuickCheckoutComponent implements OnInit, OnDestroy {

    isOpen = false;
    product: any = null;
    qty = 1;
    selectedOptions: { [k: string]: string } = {};

    readonly sessionId: string = (() => {
        let s = sessionStorage.getItem('qc_session');
        if (!s) { s = `qc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; sessionStorage.setItem('qc_session', s); }
        return s;
    })();

    // Compact form fields
    firstName = '';
    lastName  = '';
    email    = '';
    phone    = '';
    address  = '';
    landmark = '';
    city     = '';
    state    = '';
    postcode = '';

    isProcessing = false;
    errors: { [k: string]: string } = {};

    // Payment config
    razorpayKeyId   = '';
    phonePeActive   = false;
    phonePeMerchantId = '';
    razorpayActive  = false;
    codActive       = false;

    // Payment method selection
    showMethodPicker = false;
    selectedMethod: 'razorpay' | 'phonepe' | 'cod' | null = null;
    step: 'form' | 'payment' = 'form';

    // Sale countdown timer
    saleTimeLeft = '';
    private timerInterval: any;
    private timerSeconds = 10 * 60; // 10 minutes

    private sub!: Subscription;
    private formChange$ = new Subject<void>();
    private formSub!: Subscription;

    constructor(
        public qcService: QuickCheckoutService,
        public sharedService: SharedService,
        private http: HttpClient,
        private router: Router,
        private metaPixel: MetaPixelService
    ) {}

    ngOnInit() {
        this.sub = this.qcService.open$.subscribe(ctx => {
            if (ctx) {
                this.product = ctx.product;
                this.qty = ctx.qty;
                this.selectedOptions = ctx.selectedOptions || {};
                this.errors = {};
                this.firstName = '';
                this.lastName  = '';
                this.email     = '';
                this.phone     = '';
                this.address   = '';
                this.landmark  = '';
                this.city      = '';
                this.state     = '';
                this.postcode  = '';
                this.selectedMethod = null;
                this.showMethodPicker = false;
                this.step = 'form';
                this.isOpen = true;
                document.body.style.overflow = 'hidden';
                this.loadPaymentConfig();
                this.startSaleTimer();
            } else {
                this.isOpen = false;
                document.body.style.overflow = '';
                this.stopSaleTimer();
            }
        });

        this.formSub = this.formChange$.pipe(debounceTime(800)).subscribe(() => {
            if (!this.product) return;
        });
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
        this.formSub?.unsubscribe();
        this.stopSaleTimer();
        document.body.style.overflow = '';
    }

    onFormChange() { this.formChange$.next(); }

    onPhoneInput() {
        // Strip non-digits and cap at 10
        this.phone = this.phone.replace(/\D/g, '').slice(0, 10);
        this.onFormChange();
    }

    private startSaleTimer() {
        this.timerSeconds = 10 * 60;
        this.updateTimerDisplay();
        this.stopSaleTimer();
        this.timerInterval = setInterval(() => {
            if (this.timerSeconds > 0) {
                this.timerSeconds--;
                this.updateTimerDisplay();
            } else {
                this.timerSeconds = 10 * 60; // reset and loop
            }
        }, 1000);
    }

    private stopSaleTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private updateTimerDisplay() {
        const m = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
        const s = (this.timerSeconds % 60).toString().padStart(2, '0');
        this.saleTimeLeft = `${m}:${s}`;
    }

    close() { this.qcService.close(); }

    @HostListener('document:keydown.escape')
    onEsc() { if (this.isOpen) this.close(); }

    get currency(): string { return this.sharedService.siteConfig?.currency || '₹'; }
    get deliveryCharge(): number { return parseFloat(this.sharedService.siteConfig?.deliveryCharge) || 0; }
    get unitPrice(): number { return this.product?.salePrice || this.product?.price || 0; }
    get subtotal(): number { return this.unitPrice * this.qty; }
    get total(): number { return this.subtotal + this.deliveryCharge; }

    changeQty(delta: number) { this.qty = Math.max(1, this.qty + delta); this.onFormChange(); }

    get fullName(): string { return `${this.firstName} ${this.lastName}`.trim(); }

    buildItems() {
        if (!this.product) return [];
        return [{ id: this.product.id, name: this.product.name, slug: this.product.slug,
            price: this.product.price, salePrice: this.product.salePrice || null,
            image: this.product.images?.[0] || '', quantity: this.qty, selectedOptions: this.selectedOptions }];
    }

    buildAddress() {
        if (!this.address) return null;
        return {
            name: this.fullName,
            line1: this.address,
            landmark: this.landmark,
            city: this.city,
            state: this.state,
            postcode: this.postcode
        };
    }

    validate(): boolean {
        this.errors = {};
        if (!this.firstName.trim()) this.errors['firstName'] = 'Required';
        if (!this.lastName.trim())  this.errors['lastName']  = 'Required';
        const ph = this.phone.trim().replace(/\D/g, '');
        if (!ph || ph.length !== 10)
            this.errors['phone'] = 'Enter valid 10 digit mobile number';
        if (!this.address.trim() || this.address.trim().length < 12)
            this.errors['address'] = 'Please enter your full address (min 12 characters)';
        if(this.landmark){
            if (this.landmark.trim().length < 4) this.errors['landmark'] = 'Please enter proper landmark';
        }
        if (!this.postcode.trim() || !/^\d{6}$/.test(this.postcode.trim()))
            this.errors['postcode'] = 'Enter valid 6 digit pincode';
        if (!this.state.trim())  this.errors['state']  = 'Required';
        if (!this.city.trim())   this.errors['city']   = 'Required';
        return Object.keys(this.errors).length === 0;
    }

    loadPaymentConfig() {
        this.http.get<any>(urlConstant.PaymentSettingsAPI.getPublic).subscribe({
            next: res => {
                this.razorpayKeyId  = res.razorpay?.keyId || '';
                this.razorpayActive = !!(res.razorpay?.isActive && res.razorpay?.keyId);
                this.phonePeActive  = !!(res.phonepe?.isActive);
                this.phonePeMerchantId = res.phonepe?.merchantId || '';
                this.codActive      = !!(res.cod?.isActive);
                // If nothing is active, default to COD
                if (!this.razorpayActive && !this.phonePeActive && !this.codActive) {
                    this.codActive = true;
                }
            },
            error: () => {
                // On error, default to COD so checkout still works
                this.codActive = true;
            }
        });
    }

    get activeMethodCount(): number {
        return [this.razorpayActive, this.phonePeActive, this.codActive].filter(Boolean).length;
    }

    // Step 1 footer button — validate form then go to payment step
    proceedToPayment() {
        if (!this.validate()) {
            // Scroll to first error field
            setTimeout(() => {
                const el = document.querySelector('.qc-field.err');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            return;
        }

        // Auto-select first available method
        if (this.razorpayActive) this.selectedMethod = 'razorpay';
        else if (this.phonePeActive) this.selectedMethod = 'phonepe';
        else if (this.codActive) this.selectedMethod = 'cod';
        else {
            this.sharedService.showAlert(2, 'No payment method is configured. Please contact support.');
            return;
        }

        this.metaPixel.initiateCheckout({
            value: this.total, currency: this.currency,
            numItems: this.qty, email: this.email, phone: this.phone
        });

        // If only 1 method active — skip payment step, go straight to confirm
        if (this.activeMethodCount === 1) {
            this.step = 'payment'; // set step so isProcessing state shows correctly
            this.confirmPayment();
            return;
        }

        // Multiple methods — show payment step
        this.step = 'payment';
    }

    goBackToForm() {
        this.step = 'form';
    }

    // Step 2 footer button — execute payment
    async confirmPayment() {
        if (!this.selectedMethod) {
            this.sharedService.showAlert(2, 'Please select a payment method.');
            return;
        }
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (this.selectedMethod === 'phonepe') {
                await this.initiatePhonePe();
            } else if (this.selectedMethod === 'razorpay') {
                await this.initiateRazorpay();
            } else {
                this.createOrder({ paymentMethod: 'cod', paymentId: null });
            }
        } catch {
            this.isProcessing = false;
            this.sharedService.showAlert(2, 'Something went wrong. Please try again.');
        }
    }

    async placeOrder() { /* legacy — kept for safety, not called */ }
    selectMethod(method: 'razorpay' | 'phonepe' | 'cod') { /* legacy */ }
    cancelMethodPicker() { /* legacy */ }

    // ── PhonePe ───────────────────────────────────────────────────────────────
    async initiatePhonePe() {
        const transactionId = `QC_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const redirectUrl = `${window.location.origin}/order-success?txn=${transactionId}&session=${this.sessionId}`;

        this.http.post<any>(urlConstant.PaymentSettingsAPI.phonePeInitiate, {
            amount: this.total,
            orderId: transactionId,
            name: this.fullName,
            phone: this.phone,
            redirectUrl
        }).subscribe({
            next: res => {
                if (res.redirectUrl) {
                    // Store pending order data in sessionStorage for callback
                    sessionStorage.setItem('qc_pending', JSON.stringify({
                        transactionId, sessionId: this.sessionId,
                        items: this.buildItems(), subtotal: this.subtotal,
                        deliveryCharge: this.deliveryCharge, total: this.total,
                        deliveryAddress: this.buildAddress(), contactPhone: this.phone,
                        guestName: this.fullName, guestEmail: this.email
                    }));
                    window.location.href = res.redirectUrl;
                } else {
                    this.isProcessing = false;
                }
            },
            error: () => { this.isProcessing = false; }
        });
    }

    // ── Razorpay ──────────────────────────────────────────────────────────────
    async initiateRazorpay() {
        if (!this.razorpayKeyId) {
            this.sharedService.showAlert(2, 'Razorpay is not configured. Please contact support.');
            this.isProcessing = false;
            return;
        }
        try {
            await this.loadRazorpayScript();
            const options = {
                key: this.razorpayKeyId,
                amount: Math.round(this.total * 100),
                currency: 'INR',
                name: this.sharedService.siteConfig?.siteName || 'Store',
                description: `${this.product.name} × ${this.qty}`,
                prefill: { name: this.fullName, email: this.email, contact: this.phone },
                theme: { color: '#e53935' },
                handler: (response: any) => this.createOrder({
                    paymentMethod: 'razorpay',
                    paymentId: response.razorpay_payment_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id
                }),
                modal: { ondismiss: () => { this.isProcessing = false; } }
            };
            const rzp = new Razorpay(options);
            rzp.open();
        } catch {
            this.isProcessing = false;
            this.sharedService.showAlert(2, 'Could not load Razorpay. Please try again.');
        }
    }

    createOrder(paymentData: any) {
        const payload = {
            sessionId: this.sessionId,
            items: this.buildItems(),
            subtotal: this.subtotal,
            deliveryCharge: this.deliveryCharge,
            total: this.total,
            deliveryAddress: this.buildAddress(),
            contactPhone: this.phone,
            guestName: this.fullName,
            guestEmail: this.email,
            status: 'confirmed',
            ...paymentData
        };
        this.http.post<any>(urlConstant.OrderAPI.createOrder, payload).subscribe({
            next: res => {
                this.isProcessing = false;
                if (res?.alreadyExists || res?.blocked) {
                    this.sharedService.showAlert(1, res?.message || 'Your order is already created');
                    this.close();
                    const orderId = res?.data?.id;
                    if (orderId && orderId !== 0) {
                        this.router.navigate(['/order-success', orderId], { queryParams: { duplicate: '1' } });
                    }
                    return;
                }
                const orderId = res?.data?.id || res?.id;
                this.close();
                if (orderId) {
                    this.router.navigate(['/order-success', orderId]);
                } else {
                    this.router.navigate(['/order-success']);
                }
            },
            error: (err) => {
                this.isProcessing = false;
                this.sharedService.showAlert(2, err?.error?.error || err?.error?.message || 'Order creation failed. Please try again.');
            }
        });
    }

    loadRazorpayScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof Razorpay !== 'undefined') { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = () => resolve(); s.onerror = () => reject();
            document.body.appendChild(s);
        });
    }

    getOptionEntries(opts: any): { key: string; value: string }[] {
        return Object.entries(opts || {}).map(([key, value]) => ({ key, value: value as string }));
    }
}
