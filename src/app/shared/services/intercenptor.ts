import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SharedService } from './shared.service';
import { SpinnerService } from './spinner.service';
import { environment } from '../environment/environment';

@Injectable()
export class Interceptor implements HttpInterceptor {

    constructor(
        private router: Router,
        public sharedService: SharedService,
        private spinnerservice: SpinnerService
    ) { }

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {

        // -------------------- Set Auth Token 
        let adminToken: any = localStorage.getItem('admin_token');
        if (adminToken) {
            let token = atob(adminToken);
            request = request.clone({ setHeaders: { 'Authorization': token.replaceAll('"','')}});
        }

        setTimeout(() => {
            if(request.url.includes('siteconfig/getSiteconfig') || request.url.includes('dashboard/superAdminDashboard') || request.url.includes('file/getFoldersByPath')){
            }else{
                this.spinnerservice.isSpinnerShow = true;
            }
        }, 0);

        return next.handle(request).pipe(tap((event: HttpEvent<any>) => {
            if (event instanceof HttpResponse) {
                setTimeout(() => {
                    if(request.url.includes('siteconfig/getSiteconfig') || request.url.includes('dashboard/superAdminDashboard')){
                    }else{
                        this.spinnerservice.isSpinnerShow = false;
                    }
                }, 0);
            }
        }, (({ error }) => {
            this.spinnerservice.isSpinnerShow = false;
                
            if (error && error.status === 401) {
                this.sharedService.showAlert(2,'User Token Expired!');
                localStorage.clear();
                if (this.router.url !== '/') {
                    this.router.navigate(['/']);
                }
            }
        })
        ));
    }
}


