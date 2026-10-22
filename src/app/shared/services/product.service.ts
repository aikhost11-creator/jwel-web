import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { urlConstant } from '../constant/urlConst';

@Injectable({ providedIn: 'root' })
export class ProductService {
    constructor(private http: HttpClient) {}

    getProducts(params: any) {
        const q = new URLSearchParams();
        Object.keys(params).forEach(k => { if (params[k] !== null && params[k] !== undefined && params[k] !== '') q.set(k, params[k]); });
        return this.http.get<any>(`${urlConstant.ProductAPI.getProducts}?${q.toString()}`);
    }

    getFeaturedProducts() {
        return this.http.get<any>(urlConstant.ProductAPI.getFeaturedProducts);
    }

    getProduct(slug: string) {
        return this.http.get<any>(urlConstant.ProductAPI.getProduct + slug);
    }

    getRelated(categoryId: number, excludeId: number, limit = 8) {
        return this.http.get<any>(`${urlConstant.ProductAPI.getRelated}?categoryId=${categoryId}&excludeId=${excludeId}&limit=${limit}`);
    }

    getReviews(productId: number, limit = 8, offset = 0, sort = 'newest') {
        return this.http.get<any>(`${urlConstant.ProductAPI.getReviews}${productId}?limit=${limit}&offset=${offset}&sort=${sort}`);
    }

    addReview(productId: number, data: any) {
        return this.http.post<any>(urlConstant.ProductAPI.addReview + productId, data);
    }
}
