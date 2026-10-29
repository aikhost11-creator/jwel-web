import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { urlConstant } from '../constant/urlConst';

@Injectable({
    providedIn: 'root'
})
export class HomeSlotService {
    constructor(private http: HttpClient) { }

    getActive() {
        return this.http.get<any>(urlConstant.HomeSlotAPI.getActive);
    }
}
