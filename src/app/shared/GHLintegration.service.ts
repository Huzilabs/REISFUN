import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GhlIntegrationService {
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  private userTypeSubject = new BehaviorSubject<string | null>(null);
  private userDetailsSubject = new BehaviorSubject<any | null>(null);
  private isInitialized = false;
  private locationId = '';

  constructor(
    private _httpClient: HttpClient,
    private _activatedRoute: ActivatedRoute
  ) {}

  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[GHL] Initializing Integration Service');

    // 1. Check stored data on page reload
    const storedToken = localStorage.getItem('ghl_access_token');
    const storedUserType = localStorage.getItem('ghl_user_type');
    const storedUserDetails = localStorage.getItem('ghl_user_details');

    if (storedToken && storedUserDetails) {
      this.accessTokenSubject.next(storedToken);
      this.userTypeSubject.next(storedUserType);
      const parsedUserDetails = JSON.parse(storedUserDetails);
      this.userDetailsSubject.next(parsedUserDetails);
      if (parsedUserDetails?.location_id) {
        this.locationId = parsedUserDetails.location_id;
      }
      console.log('[GHL] Loaded user from localStorage');
      return;
    }

    // 2. Check route
    const currentPath = window.location.pathname;
    const isDashboard = currentPath.includes('/dashboards/dashboard');

    if (!isDashboard) {
      console.log('[GHL] Not a dashboard route. Using stored credentials if available.');
      this.checkForStoredToken();
      return;
    }

    // 3. Handle query param ?code=
    this._activatedRoute.queryParams.subscribe(async params => {
      const code = params['code']?.trim();
      if (code) {
        console.log('[GHL] Found code in URL:', code);
        this.callApiWithCode(code);
      } else {
        console.log('[GHL] No code. Attempting SSO using postMessage...');
        await this.getUserData();
      }
    });
  }

  private async getUserData(): Promise<void> {
    try {
      const ssoKey = await new Promise<string | null>((resolve) => {
        window.parent.postMessage({ message: "REQUEST_USER_DATA" }, "*");

        const messageHandler = ({ data }: MessageEvent) => {
          if (data.message === "REQUEST_USER_DATA_RESPONSE") {
            window.removeEventListener("message", messageHandler);
            const key = data.payload;
            resolve(key || null);
          }
        };

        window.addEventListener("message", messageHandler);

        setTimeout(() => {
          window.removeEventListener("message", messageHandler);
          resolve(null);
        }, 10000);
      });

      if (!ssoKey) {
        throw new Error("Encrypted SSO key is missing from payload.");
      }

      console.log('[GHL SSO] Raw user data received from parent:', ssoKey);

      const apiUrl = `${environment.apiUrl}/ghl_integration?decrypt-ghl-sso=true&key=${encodeURIComponent(ssoKey)}`;
      const response = await this._httpClient.get<any>(apiUrl).toPromise();

      if (!response || !response.success) {
        throw new Error('Failed to decrypt and retrieve SSO user data');
      }

      const data = response.data; 

      const token = `sso-token-${Date.now()}`;
const userType = data.role === 'admin' ? 'Company' : (data.role || 'sso');
      const userDetails = {
        email: data.email || 'no-email@ghl.dev',
        name: data.userName || data.name || 'Unnamed User',
        location_id: data.companyId || data.activeLocation || 'no-location',
        role: data.role || 'user',  
        type: data.type || 'external',
        userId: data.userId || 'no-userid'
      };

      this.locationId = userDetails.location_id;

      this.accessTokenSubject.next(token);
      this.userTypeSubject.next(userType);
      this.userDetailsSubject.next(userDetails);

      localStorage.setItem('ghl_access_token', token);
      localStorage.setItem('ghl_user_type', userType);
      localStorage.setItem('ghl_user_details', JSON.stringify(userDetails));

      console.log('[GHL postMessage SSO] User session initialized.');
    } catch (error) {
      console.error('[GHL postMessage SSO] Error getting user data:', error);
    }
  }

  private callApiWithCode(code: string): void {
    const url = `${environment.apiUrl}/ghl_integration?connect=true&code=${encodeURIComponent(code)}`;
    console.log('[GHL] Calling API with code:', url);

    this._httpClient.get<any>(url).pipe(
      tap(response => {
        if (response.success && response.data?.token) {
          const token = response.data.token.access_token;
          const userType = response.data.token.userType;
          const userDetails = response.data.user;

          if (userDetails?.location_id) {
            this.locationId = userDetails.location_id;
          }

          this.accessTokenSubject.next(token);
          this.userTypeSubject.next(userType);
          this.userDetailsSubject.next(userDetails);

          localStorage.setItem('ghl_access_token', token);
          localStorage.setItem('ghl_user_type', userType);
          localStorage.setItem('ghl_user_details', JSON.stringify(userDetails));

          console.log('[GHL OAuth] User initialized from code.');
        } else {
          console.error('[GHL OAuth] Invalid API response:', response);
        }
      }),
      catchError(error => {
        console.error('[GHL OAuth] API request failed:', error);
        throw error;
      })
    ).subscribe();  
  }  

  private checkForStoredToken(): void {
    const storedToken = localStorage.getItem('ghl_access_token');
    const storedUserType = localStorage.getItem('ghl_user_type');
    const storedUserDetails = localStorage.getItem('ghl_user_details');

    if (storedToken) {
      this.accessTokenSubject.next(storedToken);
      if (storedUserType) {
        this.userTypeSubject.next(storedUserType);
      }
      if (storedUserDetails) {
        try {
          const userDetails = JSON.parse(storedUserDetails);
          this.userDetailsSubject.next(userDetails);

          if (userDetails?.location_id) {
            this.locationId = userDetails.location_id;
          }
        } catch (error) {
          console.error('Stored user details parsing error:', error);
        }
      }
    } else {
      console.warn('[GHL] No stored token found.');
    }
  }

  getAccessToken(): Observable<string | null> {
    return this.accessTokenSubject.asObservable();
  }

  getUserType(): Observable<string | null> {
    return this.userTypeSubject.asObservable();
  }

  getUserDetails(): Observable<any | null> {
    return this.userDetailsSubject.asObservable();
  }

  getLocationId(): string {
    return this.locationId;
  }

  processSampleData(data: any): void {
    if (data && data.success && data.data) {
      const token = data.data.token.access_token;
      const userType = data.data.token.userType;
      const userDetails = data.data.user;

      if (userDetails?.location_id) {
        this.locationId = userDetails.location_id;
      }

      this.accessTokenSubject.next(token);
      this.userTypeSubject.next(userType);
      this.userDetailsSubject.next(userDetails);

      localStorage.setItem('ghl_access_token', token);
      localStorage.setItem('ghl_user_type', userType);
      localStorage.setItem('ghl_user_details', JSON.stringify(userDetails));
    }
  }
}
