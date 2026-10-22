import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { urlConstant } from '../constant/urlConst';

@Injectable({ providedIn: 'root' })
export class ReelsService {
    constructor(private http: HttpClient) {}
    getActive() { return this.http.get<any>(urlConstant.ReelsAPI.getActive); }
}
