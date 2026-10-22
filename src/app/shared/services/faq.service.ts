import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { urlConstant } from '../constant/urlConst';

@Injectable({ providedIn: 'root' })
export class FaqService {
    constructor(private http: HttpClient) {}

    getPreview(limit = 5) {
        return this.http.get<any>(`${urlConstant.FaqAPI.preview}?limit=${limit}`);
    }

    getPublic() {
        return this.http.get<any>(urlConstant.FaqAPI.public);
    }

    getConfig() {
        return this.http.get<any>(urlConstant.FaqAPI.config);
    }
}
