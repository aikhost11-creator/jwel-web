import { Component, OnInit } from '@angular/core';
import { FaqService } from '../../shared/services/faq.service';

@Component({
    selector: 'app-faqs',
    standalone: false,
    templateUrl: './faqs.component.html',
    styleUrl: './faqs.component.scss'
})
export class FaqsComponent implements OnInit {

    topics: any[] = [];
    config: any = null;
    isLoading = true;
    openMap: { [key: string]: boolean } = {};

    constructor(private faqService: FaqService) {}

    ngOnInit(): void {
        this.faqService.getConfig().subscribe({
            next: (res: any) => { this.config = res.data; },
            error: () => {}
        });
        this.faqService.getPublic().subscribe({
            next: (res: any) => {
                this.topics = (res.data || []).filter((t: any) => t.faqs?.length > 0);
                this.isLoading = false;
            },
            error: () => { this.isLoading = false; }
        });
    }

    toggle(key: string) {
        this.openMap[key] = !this.openMap[key];
    }

    isOpen(key: string): boolean {
        return !!this.openMap[key];
    }
}
