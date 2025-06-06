import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface GoogleToken {  
  access_token: string;
  scope: string;
  token_type: string;
  expiry_date: number; // Epoch milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private baseUrl = `${environment.apiUrl.replace(/\/$/, '')}`;
  private tokenKey = 'google_calendar_token';

  constructor(private http: HttpClient) {}

  /**
   * Generate Google OAuth URL for popup authentication
   */
  getOAuthUrl(): string {
    const redirectUrl = `${this.baseUrl}/google_oauth`;
    console.log('[GoogleCalendarService] OAuth URL:', redirectUrl);
    return redirectUrl;
  }

  /** 
   * Redirect user to Google OAuth flow 
   * @deprecated Use getOAuthUrl() with popup instead
   */
  initiateGoogleOAuth(): void {
    const redirectUrl = `${this.baseUrl}/google_oauth`;
    console.log('[GoogleCalendarService] Redirecting to Google OAuth:', redirectUrl);
    window.location.href = redirectUrl;
  }

  /** Exchange authorization code for access token */
  getAccessToken(code: string): Observable<GoogleToken> {
    const params = new HttpParams()
      .set('get_token', 'true')
      .set('code', code);

    const url = `${this.baseUrl}/google_integration`;
    console.log('[GoogleCalendarService] Requesting token from:', url);

    return this.http.get<{ success: boolean; data: { token: GoogleToken } }>(url, { params }).pipe(
      tap(response => {
        console.log('[GoogleCalendarService] Received token response:', response);
      }),
      map(response => response.data.token)
    );
  }

  /** Store access token in localStorage */
  storeToken(token: GoogleToken): void {
    if (token?.access_token && token?.expiry_date) {
      localStorage.setItem(this.tokenKey, JSON.stringify(token));
      console.log('[GoogleCalendarService] Token stored:', token);
    } else {
      console.error('[GoogleCalendarService] Invalid token object. Not stored.', token);
    }
  }

  /** Retrieve token from localStorage */
  getStoredToken(): GoogleToken | null {
    try {
      const tokenStr = localStorage.getItem(this.tokenKey);
      if (!tokenStr) return null;

      const token: GoogleToken = JSON.parse(tokenStr);

      // Check if token is expired
      if (!token.expiry_date || Date.now() > token.expiry_date) {
        console.warn('[GoogleCalendarService] Token expired or invalid expiry_date.');
        return null;
      }

      return token;
    } catch (err) {
      console.error('[GoogleCalendarService] Failed to parse stored token:', err);
      return null;
    }
  }

  /** Fetch Google Calendar events using stored token */
  fetchCalendarEvents(): Observable<any> {
    const token = this.getStoredToken();
    if (!token) {
      console.warn('[GoogleCalendarService] Cannot fetch events. Token missing or expired.');
      return of({ success: false, error: 'No valid token' });
    }

    const url = `${this.baseUrl}/google_integration`;
    return this.http.post(url, token).pipe(
      tap(events => {
        console.log('[GoogleCalendarService] Calendar events fetched:', events);
      })
    );
  }

  /** Delete the token */
  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    console.log('[GoogleCalendarService] Token removed from localStorage.');
  }

  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(): boolean {
    const token = this.getStoredToken();
    if (!token || !token.expiry_date) {
      return false;
    }

    const now = Date.now();
    
    // Add 5 minute buffer
    return now < (token.expiry_date - 5 * 60 * 1000);
  }
}