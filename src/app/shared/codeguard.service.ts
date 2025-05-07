import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CodeGuard implements CanActivate, CanActivateChild {
  
  // Track whether a valid code has been processed during this session
  private hasProcessedValidCode: boolean = false;
  
  constructor(private router: Router) {}
  
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const code = this._getCodeFromUrl();
    // console.log('Code from URL:', code);
    
    // Check if user is already authenticated through a valid session
    if (this.isUserSignedIn()) {
      // console.log('User is already signed in with token');
      
      // If there's a code in the URL, process it regardless
      if (code) {
        this._processAuthCode(code);
        this.hasProcessedValidCode = true;
      }
      
      // If user is already signed in, allow access regardless of code
      return true;
    }
    
    // User is not signed in - always need a code
    if (!code) {
      // console.log('User not signed in and no code provided. Redirecting to sign-in.');
      this.router.navigateByUrl('/sign-in');
      return false;
    }
    
    // Try to authenticate with the provided code
    const isValidCode = this._processAuthCode(code);
    if (!isValidCode) {
      // console.log('Invalid code provided. Redirecting to sign-in.');
      this.router.navigateByUrl('/sign-in');
      return false;
    }
    
    // Mark that we've processed a valid code
    this.hasProcessedValidCode = true;
    
    // Check if authentication was successful after processing the code
    if (!this.isUserSignedIn()) {
      // console.log('Code processed but authentication failed. Redirecting to sign-in.');
      this.router.navigateByUrl('/sign-in');
      return false;
    }
    
    // Authentication successful
    return true;
  }
  
  // Can activate child routes by reusing the same logic as canActivate
  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }
  
  // Helper method to get the 'code' parameter from the URL query string
  private _getCodeFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');  // Returns 'code' if present, otherwise null
  }
  
  // Process the authentication code and return whether it's valid
  private _processAuthCode(code: string): boolean {
    // Replace this with your actual logic to exchange the code for an auth token
    // console.log('Processing auth code:', code);
    
    // Example validation logic - replace with your actual validation
    if (!code || code.trim().length === 0) {
      // console.log('Empty code provided.');
      return false;
    }
    
    try {
      // In a real app, you would make an actual HTTP request here
      // const response = await this.authService.exchangeCodeForToken(code);
      
      // For demonstration, we'll just simulate validating the code
      // A real implementation would validate with your authentication server
      const isValidCode = true; // Accept any non-empty code for now
      
      if (isValidCode) {
        // Store auth token only if the code is valid
        localStorage.setItem('authToken', 'sample-token-from-code-' + code);
        // console.log('Valid code processed and token stored.');
        return true;
      } else {
        // console.log('Code validation failed.');
        return false;
      }
    } catch (error) {
      // console.error('Error processing auth code:', error);
      return false;
    }
  }
  
  // Check if the user is signed in
  private isUserSignedIn(): boolean {
    const hasToken = localStorage.getItem('authToken') !== null;
    // console.log('User is signed in:', hasToken);
    return hasToken;
  }
}