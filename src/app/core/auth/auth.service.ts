import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { UserService } from 'app/core/user/user.service';

@Injectable()
export class AuthService {
    private _authenticated: boolean = false;

    constructor(
        private _httpClient: HttpClient,
        private _userService: UserService
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for access token
     */
    set accessToken(token: string) {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string {
        return localStorage.getItem('accessToken') ?? '';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Authenticate using the OAuth token received from GHL
     *
     * @param token The OAuth token from GHL
     * @returns Observable with authentication result
     */
    authenticateWithToken(token: string): Observable<any> {
        // Send the token to your backend to validate it
        const authUrl = `${environment.apiUrl}/auth/validate-token`;

        return this._httpClient.post(authUrl, { token }).pipe(
            tap((response: any) => {
                // Store the access token in localStorage
                this.accessToken = token;

                // Set authenticated flag to true
                this._authenticated = true;

                // Store the user on the user service
                this._userService.user = response.user;

                // Optionally, handle other session data here if needed
            }),
            catchError((error) => {
                // If token validation fails, return an observable with an error
                return throwError('Authentication failed');
            })
        );
    }

    /**
     * Check the authentication status
     * @returns Observable of authentication status
     */
    check(): Observable<boolean> {
        // Check if the user is already authenticated
        if (this._authenticated) {
            return of(true);
        }

        // If the token exists and is valid, authenticate using the token
        if (this.accessToken) {
            return this.authenticateWithToken(this.accessToken).pipe(
                switchMap(() => of(true)),
                catchError(() => of(false)) // Return false if authentication fails
            );
        }

        return of(false); // No valid token or session
    }

    /**
     * Sign out
     * @returns Observable of sign-out success
     */
    signOut(): Observable<any> {
        localStorage.removeItem('accessToken');
        this._authenticated = false;
        this._userService.user = null;

        return of(true);
    }
}
