import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
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
  team?: string;
  context_team_id?: string;
  reactions?: any[];
  formattedTime?: string; // Added this property to the interface
}

@Component({
  selector: 'datatable',
  templateUrl: './datatable.component.html',
  encapsulation: ViewEncapsulation.None
})
export class DatatableComponent implements OnInit, OnDestroy {
  accessToken = '';
  botToken = '';
  channels: SlackChannel[] = [];
  personalMessages: SlackChannel[] = [];
  messages: SlackMessage[] = [];
  teamId = '';

  loading = false;
  connectingToSlack = false;
  loadingMessages = false;
  showSidebar = false;
  selectedChannelName = '';
  selectedChannelId = '';
  selectedChannelInfo: any = null;
  newMessageText = '';
  connectionError = '';
  themeMode: 'light' | 'dark' = 'light';

  private messagePollingSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Listen for the message (from Slack OAuth callback page)
    window.addEventListener('message', this.handleOAuthMessage.bind(this));

    const savedTeamId = localStorage.getItem('slack_team_id');
    if (savedTeamId) {
      this.teamId = savedTeamId;
    }

    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code) {
        this.exchangeCodeForToken(code);
        this.router.navigate([], { queryParams: { code: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });

    const savedToken = localStorage.getItem('slack_access_token');
    if (savedToken) {
      this.accessToken = savedToken;
      this.fetchChannels();
      this.fetchPersonalMessages();

      const lastChannelId = localStorage.getItem('last_selected_channel_id');
      if (lastChannelId) {
        setTimeout(() => this.fetchMessages(lastChannelId), 1000);
      }
    }

    this.handleResponsiveDisplay();
    window.addEventListener('resize', this.handleResponsiveDisplay.bind(this));
  }

  ngOnDestroy(): void {
    // Remove the event listener when the component is destroyed
    window.removeEventListener('message', this.handleOAuthMessage.bind(this));
    window.removeEventListener('resize', this.handleResponsiveDisplay.bind(this));
    this.stopPollingMessages();
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
    this.cdr.detectChanges();
  }

  handleResponsiveDisplay(): void {
    this.showSidebar = window.innerWidth >= 768;
    this.cdr.detectChanges();
  }

  // Open the Slack OAuth URL in a popup
  connectToSlack(): void {
    this.connectingToSlack = true;
    localStorage.setItem('last_selected_channel_id', this.selectedChannelId);
    this.cdr.detectChanges();

    // Construct the Slack OAuth URL
    const oauthUrl = `${environment.apiUrl}/slack_oauth`;  // Ensure your backend URL is correct

    // Open the OAuth URL in a popup window
    const popup = window.open(oauthUrl, '_blank', 'width=600,height=700');
  }

  // Method to handle the OAuth message received from the popup
  handleOAuthMessage(event: MessageEvent): void {
    // Validate the origin of the message (security measure)
    if (event.origin !== window.location.origin) {
      console.error('Invalid message origin:', event.origin);
      return;
    }

    if (event.data.type === 'oauth-code') {
      const code = event.data.code;
      console.log('Received OAuth code:', code);
      this.exchangeCodeForToken(code);  // Call method to exchange code for token
    }
  }

  updateUIForConnection(): void {
    // You can add more UI update logic here, e.g., fetching Slack channels, showing messages, etc.
    console.log('Slack connected successfully!');
    this.fetchChannels(); // Fetch Slack channels
    this.fetchPersonalMessages(); // Fetch Direct Messages (if needed)

    // Optionally, you can trigger any UI updates like showing a "Connected" message or a success toast.
    // Example:
    alert("Successfully connected to Slack!");
  }

  // Exchange the authorization code for an access token
  exchangeCodeForToken(code: string): void {
    this.loading = true;
    this.connectionError = '';
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/slack_integration?connect=true&code=${code}`)
      .pipe(
        tap(response => {
          console.log('Token exchange response:', response);
          if (response.success && response.data?.authed_user?.access_token) {
            this.accessToken = response.data.authed_user.access_token;
            this.botToken = response.data.bot_user_id || '';
            this.teamId = response.data.team?.id || response.data.team || '';
            console.log('Set team ID from response:', this.teamId);
            localStorage.setItem('slack_team_id', this.teamId);

            localStorage.setItem('slack_access_token', this.accessToken);
            localStorage.setItem('slack_team_id', this.teamId);  // Persist it

            // Fetch channels and personal messages
            this.fetchChannels();
            this.fetchPersonalMessages();

            const lastId = localStorage.getItem('last_selected_channel_id');
            if (lastId) {
              setTimeout(() => {
                const channelExists = this.channels.some(c => c.id === lastId) ||
                                      this.personalMessages.some(p => p.id === lastId);
                if (channelExists) {
                  this.fetchMessages(lastId);
                } else {
                  if (this.channels.length > 0) {
                    this.fetchMessages(this.channels[0].id, this.channels[0].name);
                  } else if (this.personalMessages.length > 0) {
                    this.fetchMessages(this.personalMessages[0].id, this.personalMessages[0].userName || 'Direct Message');
                  }
                }
              }, 2000);
            }
          } else {
            this.connectionError = 'Failed to connect to Slack. Please try again.';
          }
        }),
        catchError(err => {
          console.error('OAuth exchange error:', err);
          this.connectionError = 'OAuth error. Please try again.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.connectingToSlack = false;
          this.cdr.detectChanges();
        })
      ).subscribe();
  }

  // Disconnect from Slack
  disconnect(): void {
    localStorage.removeItem('slack_access_token');
    localStorage.removeItem('last_selected_channel_id');
    localStorage.removeItem('slack_team_id');
    this.accessToken = '';
    this.messages = [];
    this.channels = [];
    this.personalMessages = [];
    this.selectedChannelId = '';
    this.selectedChannelName = '';
    this.teamId = '';
    this.stopPollingMessages();
    this.cdr.detectChanges();
  }

  // Fetch channels from Slack
  fetchChannels(): void {
    if (!this.accessToken) return;

    this.loading = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/slack_integration?conversations=true&token=${this.accessToken}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.channels = (response.data.channels || []).map(ch => ({
              ...ch,
              unread_count: ch.unread_count_display || 0
            }));
            this.channels.sort((a, b) => a.name.localeCompare(b.name));
          }
        }),
        catchError(err => {
          console.error('Error fetching channels:', err);
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      ).subscribe();
  }

  // Fetch personal messages (Direct messages) from Slack
  fetchPersonalMessages(): void {
    if (!this.accessToken) return;

    this.loading = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/slack_integration?conversations=true&token=${this.accessToken}&types=im`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.personalMessages = (response.data.channels || []).map(dm => ({
              ...dm,
              unread_count: dm.unread_count_display || 0
            }));
            this.fetchUserDetails();
          }
        }),
        catchError(err => {
          console.error('Error fetching DMs:', err);
          return of(null);
        }),  
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      ).subscribe();
  }

  // Fetch user info for direct messages
  fetchUserDetails(): void {
    this.personalMessages.forEach((dm, index) => {
      if (dm.user_id) {
        this.http.get<any>(`${environment.apiUrl}/slack_integration?user_info=true&user_id=${dm.user_id}&token=${this.accessToken}`)
          .pipe(
            tap(res => {
              if (res.success) {
                this.personalMessages[index].userName = res.data.user.real_name || res.data.user.name;
                this.personalMessages[index].userAvatar = res.data.user.profile?.image_48 || `https://ui-avatars.com/api/?name=${res.data.user.name}`;
                this.cdr.detectChanges();
              }
            }),
            catchError(err => {
              console.error('Error fetching user details:', err);
              return of(null);
            })
          ).subscribe();
      }
    });
  }

  // Fetch messages for a specific channel
  fetchMessages(channelId: string, channelName: string = 'Channel'): void {
    if (!this.accessToken || !channelId) {
      console.warn('❌ Missing token or channel ID for fetching messages');
      return;
    }

    this.stopPollingMessages();
    this.messages = [];
    this.selectedChannelId = channelId;
    this.selectedChannelName = channelName;
    localStorage.setItem('last_selected_channel_id', channelId);

    if (window.innerWidth < 768) this.showSidebar = false;

    this.loadingMessages = true;
    this.cdr.detectChanges();

    console.log(`📥 Fetching messages for channel: ${channelId}`);

    this.http.get<any>(`${environment.apiUrl}/slack_integration?conversations=true&channel_id=${channelId}&token=${this.accessToken}`)
      .pipe(
        tap(response => {
          console.log('📬 Messages response:', response);

          if (!response.success) {
            console.error('❌ Failed to fetch messages:', response);
            return;
          }

          let messageArray: SlackMessage[] = [];
          if (Array.isArray(response.data)) {
            messageArray = response.data;
          } else if (Array.isArray(response.data?.messages)) {
            messageArray = response.data.messages;
          } else {
            console.error('❌ Unexpected data format in messages response:', response.data);
            return;
          }

          // Sort messages by timestamp
          this.messages = messageArray.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

          // Add formatted time and other properties to messages
          this.messages = this.messages.map(msg => ({
            ...msg,
            formattedTime: this.formatMessageTime(msg.ts),
            username: msg.username || `User ${msg.user || ''}`.substring(0, 15),
            userImage: msg.userImage || `https://ui-avatars.com/api/?name=${msg.user || 'U'}&background=random`
          }));

          // Extract team ID if not already set
          if (!this.teamId && this.messages.length > 0) {
            const firstMsg = this.messages[0];
            this.teamId = firstMsg.team || firstMsg.context_team_id || '';
            if (this.teamId) {
              console.log('✅ Extracted team ID from message:', this.teamId);
              localStorage.setItem('slack_team_id', this.teamId);
            } else {
              console.warn('⚠️ No team ID found in message metadata');
            }
          }

          // Auto-scroll to bottom after messages load
          setTimeout(() => {
            const container = document.querySelector('.messages-container');
            if (container) container.scrollTop = container.scrollHeight;
          }, 100);
        }),
        catchError(err => {
          console.error('❌ Error fetching messages:', err);
          return of(null);
        }),
        finalize(() => {
          this.loadingMessages = false;
          if (this.messages.length > 0) {
            this.startPollingMessages();
          }
          this.cdr.detectChanges();
        })
      ).subscribe();
  }

  // Format message timestamp to readable time
  formatMessageTime(ts: string): string {
    return new Date(parseFloat(ts) * 1000).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  }

  // Get message date (alternative method if needed in template)
 getMessageDate(ts: string): string {
      return new Date(parseFloat(ts) * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

  // Get full formatted date and time
  getFullMessageDateTime(ts: string): string {
    return new Date(parseFloat(ts) * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Check if date separator should be shown between messages
  shouldShowDateSeparator(previousMessage: SlackMessage | null, currentMessage: SlackMessage): boolean {
    if (!previousMessage) return true;
    
    const prevDate = new Date(parseFloat(previousMessage.ts) * 1000);
    const currDate = new Date(parseFloat(currentMessage.ts) * 1000);
    
    // Show separator if messages are on different days
    return prevDate.toDateString() !== currDate.toDateString();
  }

  // Send a message to the selected channel
  sendMessage(): void {
    if (!this.newMessageText.trim() || !this.selectedChannelId || !this.accessToken) {
      return;
    }

    const messageData: post_message = {
      token: this.accessToken,
      channel: this.selectedChannelId,
      text: this.newMessageText.trim(),
      send_message: true
    };

    this.http.post<any>(`${environment.apiUrl}/slack_integration`, messageData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.newMessageText = '';
            // Refresh messages to show the new message
            setTimeout(() => this.fetchMessages(this.selectedChannelId, this.selectedChannelName), 500);
          } else {
            console.error('Failed to send message:', response);
          }
        }),
        catchError(err => {
          console.error('Error sending message:', err);
          return of(null);
        })
      ).subscribe();
  }

  // Start polling messages
  private startPollingMessages(): void {
    this.stopPollingMessages(); // Ensure no duplicate subscriptions
    
    this.messagePollingSubscription = interval(15000).subscribe(() => {
      if (this.selectedChannelId && this.accessToken) {
        this.http.get<any>(`${environment.apiUrl}/slack_integration?conversations=true&channel_id=${this.selectedChannelId}&token=${this.accessToken}`)
          .pipe(
            tap(response => {
              if (response.success) {
                const incoming = response.data.messages || [];
                const newMessages = incoming.filter(msg => 
                  !this.messages.some(existing => existing.ts === msg.ts)
                );
                
                if (newMessages.length > 0) {
                  // Add formatted properties to new messages
                  const formattedNewMessages = newMessages.map(msg => ({
                    ...msg,
                    formattedTime: this.formatMessageTime(msg.ts),
                    username: msg.username || `User ${msg.user || ''}`.substring(0, 15),
                    userImage: msg.userImage || `https://ui-avatars.com/api/?name=${msg.user || 'U'}&background=random`
                  }));

                  this.messages = [...this.messages, ...formattedNewMessages];
                  this.messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
                  
                  this.cdr.detectChanges();
                  
                  // Auto-scroll to bottom for new messages
                  setTimeout(() => {
                    const container = document.querySelector('.messages-container');
                    if (container) container.scrollTop = container.scrollHeight;
                  }, 100);
                }
              }
            }),
            catchError(err => {
              console.error('Error polling messages:', err);
              return of(null);
            })
          ).subscribe();
      }
    });
  }

  // Stop polling messages
  private stopPollingMessages(): void {
    if (this.messagePollingSubscription) {
      this.messagePollingSubscription.unsubscribe();
      this.messagePollingSubscription = null;
    }
  }

  // Method for handling emoji unicode conversions
  getEmojiUnicode(hex: string): string {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch (e) {
      return ''; // fallback
    }
  }

  // Toggle theme mode
  toggleTheme(): void {
    this.themeMode = this.themeMode === 'light' ? 'dark' : 'light';
    this.cdr.detectChanges();
  }

  // Utility method to check if a message is from the current user
  isCurrentUserMessage(message: SlackMessage): boolean {
    // You'll need to implement logic to determine current user
    // This could be based on stored user info or API response
    return false; // Placeholder
  }

  // Handle Enter key in message input
  onMessageKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}  