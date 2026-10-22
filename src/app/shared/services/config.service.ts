import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environment/environment';
import { rebuildUrlConstant } from '../constant/urlConst';

export interface AppConfiguration {
  APIUrl?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: AppConfiguration = {};
  private loaded = false;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    if (this.loaded) return;   // already loaded — skip duplicate call
    try {
      const cfg = await firstValueFrom(
        this.http.get<AppConfiguration>('assets/configuration.json')
      );
      this.config = cfg || {};

      if (this.config.APIUrl) {
        environment.APIUrl = this.ensureTrailingSlash(this.config.APIUrl);
      }

      rebuildUrlConstant();
    } catch (e) {
      rebuildUrlConstant();
    }
    this.loaded = true;
  }

  get<T = any>(key: keyof AppConfiguration | string, fallback?: T): T {
    const val = (this.config as any)?.[key as any];
    return (val !== undefined ? val : (fallback as any)) as T;
  }

  private ensureTrailingSlash(url: string): string {
    if (!url) return url;
    return url.endsWith('/') ? url : url + '/';
  }
}
