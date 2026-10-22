import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { urlConstant } from '../constant/urlConst';

@Injectable({
    providedIn: 'root'
})
export class HomeBannerService {
    constructor(private http: HttpClient) { }

    getActiveBanners() {
        return this.http.get<any>(urlConstant.HomeBannerAPI.getActiveBanners);
    }
}
