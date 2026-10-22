import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SharedService } from './shared/services/shared.service';
import { AppStoreService } from './shared/services/app-store.service';
import { MetaPixelService } from './shared/services/meta-pixel.service';
import { SeoService } from './shared/services/seo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Store';

  constructor(
    private router: Router,
    private sharedservice: SharedService,
    public appStore: AppStoreService,
    private metaPixel: MetaPixelService,
    private seo: SeoService
  ) {
    // Fire PageView on every navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.metaPixel.pageView();
      }
    });
  }

  ngOnInit(): void {
    this.onResize(null);
    this.appStore.loadAll();

    // Update title when siteConfig loads
    this.appStore.categories$.subscribe(() => {
      const siteName = this.sharedservice.siteConfig?.siteName;
      if (siteName) this.seo.setDefault(siteName);
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (event) {
      this.sharedservice.deviceWidth = event.target.innerWidth;
      this.sharedservice.deviceHeight = event.target.innerHeight;
    } else {
      this.sharedservice.deviceWidth = window.innerWidth;
      this.sharedservice.deviceHeight = window.innerHeight;
    }
  }
}