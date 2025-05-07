import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';

import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
  
@Component({
    selector     : 'auth-sign-in',
    templateUrl  : './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class AuthSignInComponent implements OnInit
{
    alert: { type: FuseAlertType; message: string } = {
        type   : 'success',
        message: ''
    };
    showAlert: boolean = false;

    // Default redirect URL
    private redirectURL: string = '/dashboards/dashboard';

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _router: Router,
        private http: HttpClient
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Check if there's a custom redirect URL in the query parameters
        const queryParamRedirect = this._activatedRoute.snapshot.queryParamMap.get('redirectURL');
        if (queryParamRedirect) {
            this.redirectURL = decodeURIComponent(queryParamRedirect); // Decoding the URL if necessary
        }
    }   

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * GHL login
     */
    ghllogin(): void {
        // Redirect the user to the GHL OAuth login page
        const redirectUrl = encodeURIComponent(this.redirectURL);

        window.location.href = `${environment.apiUrl}/ghl_oauth`;
    }

    /**
     * Handle OAuth redirect and authenticate the user with the token
     */
    handleOAuthRedirect(): void {
        this._router.navigateByUrl(this.redirectURL); // Default to the redirect URL after successful authentication
   
       }
    
}
