import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { urlConstant } from '../../shared/constant/urlConst';

const PAGE_META: { [slug: string]: { title: string } } = {
    'shipping-policy':  { title: 'Shipping Policy' },
    'return-refund':    { title: 'Return & Refund Policy' },
    'privacy-policy':   { title: 'Privacy Policy' },
    'terms-conditions': { title: 'Terms & Conditions' },
};

@Component({
    selector: 'app-legal-page',
    standalone: false,
    templateUrl: './legal-page.component.html',
    styleUrl: './legal-page.component.scss'
})
export class LegalPageComponent implements OnInit {

    slug = '';
    title = '';
    content = '';
    isLoading = true;
    notFound = false;

    constructor(private route: ActivatedRoute, private http: HttpClient) {}

    ngOnInit() {
        this.route.params.subscribe(params => {
            // Support both /policy/:slug and static routes with data.slug
            this.slug = params['slug'] || this.route.snapshot.data['slug'] || '';
            this.title = PAGE_META[this.slug]?.title || 'Policy';
            this.loadPage();
        });
    }

    loadPage() {
        this.isLoading = true;
        this.notFound = false;
        this.http.get<any>(urlConstant.LegalPagesAPI.getBySlug + this.slug).subscribe({
            next: res => {
                if (res.data) {
                    this.title   = res.data.title   || this.title;
                    this.content = res.data.content || '';
                } else {
                    this.notFound = true;
                }
                this.isLoading = false;
            },
            error: () => { this.notFound = true; this.isLoading = false; }
        });
    }
}
