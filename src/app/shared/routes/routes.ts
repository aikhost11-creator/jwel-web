import { Routes } from "@angular/router";
import { HomeComponent } from "../../components/home/home.component";
import { ShopComponent } from "../../components/shop/shop.component";
import { ProductDetailComponent } from "../../components/product-detail/product-detail.component";
import { CheckoutComponent } from "../../components/checkout/checkout.component";
import { OrderSuccessComponent } from "../../components/order-success/order-success.component";
import { LegalPageComponent } from "../../components/legal-page/legal-page.component";
import { AboutUsComponent } from "../../components/about-us/about-us.component";
import { FaqsComponent } from "../../components/faqs/faqs.component";
import { FavouritesComponent } from "../../components/favourites/favourites.component";

export const routing: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'shop', component: ShopComponent },
    { path: 'category/:id', component: ShopComponent },
    { path: 'product/:slug', component: ProductDetailComponent },
    { path: 'cart', redirectTo: 'shop', pathMatch: 'full' },
    { path: 'bag', redirectTo: 'shop', pathMatch: 'full' },
    { path: 'checkout', component: CheckoutComponent },
    { path: 'order-success/:id', component: OrderSuccessComponent },
    { path: 'order-success', component: OrderSuccessComponent },
    { path: 'about-us', component: AboutUsComponent },
    { path: 'faqs', component: FaqsComponent },
    { path: 'wishlist', component: FavouritesComponent },
    { path: 'shipping-policy', component: LegalPageComponent, data: { slug: 'shipping-policy' } },
    { path: 'return-refund', component: LegalPageComponent, data: { slug: 'return-refund' } },
    { path: 'privacy-policy', component: LegalPageComponent, data: { slug: 'privacy-policy' } },
    { path: 'terms-conditions', component: LegalPageComponent, data: { slug: 'terms-conditions' } },
    { path: 'policy/:slug', component: LegalPageComponent },
    { path: '**', redirectTo: '' },
];
