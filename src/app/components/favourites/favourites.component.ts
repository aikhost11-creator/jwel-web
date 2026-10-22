import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FavouritesService, FavouriteItem } from '../../shared/services/favourites.service';

@Component({
    selector: 'app-favourites',
    standalone: false,
    templateUrl: './favourites.component.html',
    styleUrl: './favourites.component.scss'
})
export class FavouritesComponent implements OnInit, OnDestroy {

    items: FavouriteItem[] = [];
    private sub: Subscription;

    constructor(public favService: FavouritesService) { }

    ngOnInit(): void {
        this.sub = this.favService.items$.subscribe(items => {
            this.items = items;
        });
    }

    ngOnDestroy(): void { this.sub?.unsubscribe(); }

    remove(id: number): void {
        this.favService.remove(id);
    }

    getFirstImage(images: string[]): string {
        return images?.[0] || '';
    }
}
