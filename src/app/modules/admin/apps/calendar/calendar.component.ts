import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-oauth-callback',
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-md text-center">
        <div class="mb-4">
          <svg class="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Processing Authentication...</h2>
        <p class="text-gray-600">Please wait while we connect your Google Calendar.</p>
        <div *ngIf="hasError" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {{ errorMessage }}
        </div>
      </div>
    </div>    
  `,
  styles: []
})
export class CalendarComponent implements OnInit {
  hasError = false;
  errorMessage = '';

  constructor() { }  

  ngOnInit(): void {
    // Check if this is from your Google OAuth backend redirect
    // Your backend likely redirects to something like: /oauth-callback?code=xxx&scope=xxx
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');   
    const scope = urlParams.get('scope');

    // Check for error first
    if (error) {
      console.error('OAuth error:', error);
      this.hasError = true;
      this.errorMessage = 'Authentication was cancelled or failed. Please close this window and try again.';
      
      // Optional: Auto-close after showing error for a few seconds
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 3000);
      return;
    }

    // Check if we have the authorization code
    if (window.opener && code) {
      console.log("Sending code to parent:", code);
      
      try {
        // Send the code to the parent window (TasksComponent)
        window.opener.postMessage({
          type: 'oauth-code',
          code: code,
          scope: scope // Include scope if your backend provides it
        }, '*'); // In production, you should restrict the targetOrigin to your app's URL
        
        // Close the popup after sending the code
        window.close();
      } catch (error) {
        console.error('Error sending message to parent:', error);
        this.hasError = true;
        this.errorMessage = 'Failed to communicate with parent window. Please close this window and try again.';
      }
    } else if (!window.opener) {
      // If no opener, this might be a direct navigation - redirect to main app
      console.log('No opener window found, redirecting to main app');
      window.location.href = '/'; // or wherever your main calendar page is
    } else {
      console.error('Error: No code found in URL');
      this.hasError = true;
      this.errorMessage = 'No authorization code found in the URL.';
      
      // Auto-close after showing error
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 3000);
    }
  }
}