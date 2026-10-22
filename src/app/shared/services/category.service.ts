import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { urlConstant } from '../constant/urlConst';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    constructor(private http: HttpClient) { }

    getPublicCategories() {
        return this.http.get<any>(urlConstant.CategoryAPI.getPublicCategories);
    }
}
