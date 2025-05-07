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
  private accessTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  private userTypeSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  private userDetailsSubject: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(null);
  private isInitialized = false;
  private locationId: string = '';

  constructor(
    private _httpClient: HttpClient,
    private _activatedRoute: ActivatedRoute
  ) {}

  /**
   * Initializes the process of fetching the access token and user details.
   * This method extracts the 'code' directly from the URL query parameters.
   */
  initialize(): void {
    if (this.isInitialized) {
      return; // Prevent multiple initializations
    }

    this.isInitialized = true;
    console.log('Initializing GHL Integration Service');

    this._activatedRoute.queryParams.subscribe(params => {
      const code = params['code']?.trim();

      if (code) {
        console.log('Found code in URL:', code);
        this.callApiWithCode(code);
      } else {
        console.error('Authorization code not found in URL');
        this.checkForStoredToken();
      }
    });
  }

  /**
   * Checks local storage for previously saved token and user details
   */
  private checkForStoredToken(): void {
    const storedToken = localStorage.getItem('ghl_access_token');
    const storedUserType = localStorage.getItem('ghl_user_type');
    const storedUserDetails = localStorage.getItem('ghl_user_details');

    if (storedToken) {
      console.log('Found stored token');
      this.accessTokenSubject.next(storedToken);
      if (storedUserType) {
        this.userTypeSubject.next(storedUserType);
      }
      if (storedUserDetails) {
        try {
          const userDetails = JSON.parse(storedUserDetails);
          this.userDetailsSubject.next(userDetails);

          // Set locationId from stored userDetails if available
          if (userDetails?.location_id) {
            this.locationId = userDetails.location_id;
          }
        } catch (error) {
          console.error('Error parsing stored user details', error);
        }
      }
    }
  }

  /**
   * Makes the API call using the 'code' from the URL
   * @param code The authorization code received in the URL
   */
  private callApiWithCode(code: string): void {
    const url = `${environment.apiUrl}/ghl_integration?connect=true&code=${encodeURIComponent(code)}`;
    console.log('Making API call to:', url);

    this._httpClient.get<any>(url).pipe(
      tap(response => {
        console.log('API Response:', response);
        if (response.success && response.data && response.data.token) {
          const token = response.data.token.access_token;
          const userType = response.data.token.userType;
          const userDetails = response.data.user;

          // Set locationId if available
          if (userDetails?.location_id) {
            this.locationId = userDetails.location_id;
          } else {
            console.warn('Location ID not found in user details.');
          }

          this.accessTokenSubject.next(token);
          this.userTypeSubject.next(userType);
          this.userDetailsSubject.next(userDetails);

          localStorage.setItem('ghl_access_token', token);
          localStorage.setItem('ghl_user_type', userType);
          localStorage.setItem('ghl_user_details', JSON.stringify(userDetails));
        } else {
          console.error('Failed to retrieve data from API:', response);
        }
      }),
      catchError(error => {
        console.error('Error occurred while making API call:', error);
        throw error;
      })
    ).subscribe();
  }

  /**
   * Utility method to process mock or sample API data
   * @param data Sample API response object
   */
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

  // Getter methods to expose data
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
}    
  