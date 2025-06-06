import {
    ChangeDetectionStrategy, Component, ViewEncapsulation, ChangeDetectorRef,
    OnInit, OnDestroy
  } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { ActivatedRoute, Router } from '@angular/router';
  import { Observable, of, Subscription, interval } from 'rxjs';
  import { catchError, finalize, tap } from 'rxjs/operators';
import { environment } from 'environments/environment';
  
  interface post_message {
    token: string;
    channel: string;
    text: string;
    send_message: boolean;
  }
  
  interface SlackChannel {
    id: string;
    name: string;
    is_channel: boolean;
    is_private: boolean;
    is_im: boolean;
    user_id?: string;
    userAvatar?: string;
    userName?: string;
    unread_count?: number;
  }
  
  interface SlackMessage {
    ts: string;
    text: string;
    user: string;
    username?: string;
    userImage?: string;
    attachments?: any[];
      // 🔽 Add these two optional fields
  team?: string;
  context_team_id?: string;

    reactions?: any[];
  }
  
  @Component({
    selector: 'chat',
    templateUrl: './chat.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  
  export class ChatComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    // Get the 'code' from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');  // Capture the 'code' from the URL query string

    if (window.opener && code) {
      console.log("Sending code to parent:", code);
      // Send the code to the parent window (DatatableComponent)
      window.opener.postMessage({
        type: 'oauth-code',
        code: code
      }, '*');  // In production, you should restrict the targetOrigin to your app's URL

      // Close the popup after sending the code
      window.close();
    } else {
      console.error('Error: No code found in URL');
      alert('Error: No code found in URL');
    }
  }
  }
    