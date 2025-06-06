import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CodeGuard implements CanActivate, CanActivateChild {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.handleAuthCheck(state.url);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.handleAuthCheck(state.url);
  }

  private handleAuthCheck(targetUrl: string): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isInsideGHL = window !== window.parent || document.referrer.includes('gohighlevel.com');
    const token = localStorage.getItem('ghl_access_token');

    if (code) {
      console.log('[CodeGuard] OAuth code found.');
      localStorage.setItem('authCode', code);
      return true;
    }

    if (isInsideGHL) {
      console.log('[CodeGuard] Inside GHL — allow access for SSO.');
      return true;
    }

    if (token) {
      console.log('[CodeGuard] Token found in localStorage — allow.');
      return true;
    }

    console.warn('[CodeGuard] Outside GHL and unauthenticated — redirecting to /sign-in.');
    this.router.navigateByUrl('/sign-in');
    return false;
  }  
}
