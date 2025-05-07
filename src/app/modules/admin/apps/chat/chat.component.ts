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
    reactions?: any[];
  }
  
  @Component({
    selector: 'chat',
    templateUrl: './chat.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export class ChatComponent implements OnInit, OnDestroy {
    accessToken = '';
    botToken = '';
    channels: SlackChannel[] = [];
    personalMessages: SlackChannel[] = [];
    messages: SlackMessage[] = [];
  
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
  
    connectToSlack(): void {
      this.connectingToSlack = true;
      localStorage.setItem('last_selected_channel_id', this.selectedChannelId);
      this.cdr.detectChanges();
      window.location.href = `${environment.apiUrl}/slack_oauth`;
    }
  
    exchangeCodeForToken(code: string): void {
        this.loading = true;
        this.connectionError = '';
        this.cdr.detectChanges();
      
        this.http.get<any>(`${environment.apiUrl}/slack_integration?connect=true&code=${code}`)
          .pipe(
            tap(response => {
              console.log('Token exchange response:', response); // Add logging
              if (response.success && response.data?.authed_user?.access_token) {
                this.accessToken = response.data.authed_user.access_token;
                this.botToken = response.data.bot_user_id || '';
                localStorage.setItem('slack_access_token', this.accessToken);
                
                // First fetch channels and personal messages
                this.fetchChannels();
                this.fetchPersonalMessages();
                
                // Increase timeout to ensure channels are loaded
                const lastId = localStorage.getItem('last_selected_channel_id');
                if (lastId) {
                  setTimeout(() => {
                    // Verify the channel exists in our loaded channels
                    const channelExists = this.channels.some(c => c.id === lastId) || 
                                         this.personalMessages.some(p => p.id === lastId);
                    if (channelExists) {
                      this.fetchMessages(lastId);
                    } else {
                      console.warn('Last selected channel no longer exists');
                      // Select first available channel instead
                      if (this.channels.length > 0) {
                        this.fetchMessages(this.channels[0].id, this.channels[0].name);
                      } else if (this.personalMessages.length > 0) {
                        this.fetchMessages(this.personalMessages[0].id, this.personalMessages[0].userName || 'Direct Message');
                      }
                    }
                  }, 2000); // Increase timeout to ensure channels are loaded
                }
              } else {
                console.error('Authentication response error:', response);
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
    disconnect(): void {
      localStorage.removeItem('slack_access_token');
      localStorage.removeItem('last_selected_channel_id');
      this.accessToken = '';
      this.messages = [];
      this.channels = [];
      this.personalMessages = [];
      this.selectedChannelId = '';
      this.selectedChannelName = '';
      this.stopPollingMessages();
      this.cdr.detectChanges();
    }
  
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
  
    fetchUserInfo(userId: string): Observable<any> {
      return this.http.get<any>(`${environment.apiUrl}/slack_integration?user_info=true&user_id=${userId}&token=${this.accessToken}`);
    }
  
    fetchUserDetails(): void {
      this.personalMessages.forEach((dm, index) => {
        if (dm.user_id) {
          this.fetchUserInfo(dm.user_id).subscribe(res => {
            if (res.success) {
              this.personalMessages[index].userName = res.data.user.real_name || res.data.user.name;
              this.personalMessages[index].userAvatar = res.data.user.profile?.image_48 || `https://ui-avatars.com/api/?name=${res.data.user.name}`;
              this.cdr.detectChanges();
            }
          });
        }
      });
    }
  
    fetchMessages(channelId: string, channelName: string = 'Channel'): void {
        if (!this.accessToken || !channelId) {
          console.warn('Missing token or channel ID for fetching messages');
          return;
        }
      
        this.stopPollingMessages();
        this.messages = [];
        this.selectedChannelId = channelId;
        this.selectedChannelName = channelName;
        localStorage.setItem('last_selected_channel_id', channelId);
      
        if (window.innerWidth < 768) this.showSidebar = false;
      
        this.loadingMessages = true; // Set to true while loading
        this.cdr.detectChanges();
      
        console.log(`Fetching messages for channel: ${channelId}`);
        
        this.http.get<any>(`${environment.apiUrl}/slack_integration?conversations=true&channel_id=${channelId}&token=${this.accessToken}`)
          .pipe(
            tap(response => {
              console.log('Messages response:', response); // Add logging
              if (response.success) {
                // Properly handle different response formats
                let messageArray: SlackMessage[] = [];
                
                if (Array.isArray(response.data)) {
                  messageArray = response.data;
                } else if (response.data && Array.isArray(response.data.messages)) {
                  messageArray = response.data.messages;
                } else {
                  console.error('Unexpected data format in messages response:', response.data);
                  return;
                }
                
                this.messages = messageArray.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
                
                // Process user information for messages
                this.messages = this.messages.map(msg => ({
                  ...msg,
                  username: msg.username || `User ${msg.user || ''}`.substring(0, 15),
                  userImage: msg.userImage || `https://ui-avatars.com/api/?name=${msg.user || 'U'}&background=random`
                }));
                
                this.selectedChannelInfo = this.channels.find(c => c.id === channelId) || 
                                          this.personalMessages.find(p => p.id === channelId);
                
                setTimeout(() => {
                  const container = document.querySelector('.messages-container');
                  if (container) container.scrollTop = container.scrollHeight;
                }, 100);
              } else {
                console.error('Failed to fetch messages:', response);
              }
            }),
            catchError(err => {
              console.error('Error fetching messages:', err);
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
  
    sendMessage(): void {
      if (!this.newMessageText.trim() || !this.selectedChannelId || !this.accessToken) return;
  
      const payload: post_message = {
        token: this.accessToken,
        channel: this.selectedChannelId,
        text: this.newMessageText,
        send_message: true
      };
  
      this.http.post<any>(`${environment.apiUrl}/slack_integration`, payload)
        .pipe(
          tap(response => {
            if (response.success) {
              this.messages.push({  
                ts: (Date.now() / 1000).toString(),
                text: this.newMessageText,
                user: 'self',
                username: 'You',  
                userImage: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
              });
              this.newMessageText = '';
              setTimeout(() => {
                const container = document.querySelector('.messages-container');
                if (container) container.scrollTop = container.scrollHeight;
              }, 100);
              this.cdr.detectChanges();
            }
          }),
          catchError(err => {
            console.error('Send message failed:', err);
            return of(null);
          })
        ).subscribe();
    }
  
    shouldShowDateSeparator(prev: SlackMessage, curr: SlackMessage): boolean {
      if (!prev || !curr) return false;
      return new Date(parseFloat(prev.ts) * 1000).toDateString() !== new Date(parseFloat(curr.ts) * 1000).toDateString();
    }
  
    getMessageDate(ts: string): string {
      return new Date(parseFloat(ts) * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  
    formatMessageTime(ts: string): string {
      return new Date(parseFloat(ts) * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  
    toggleTheme(): void {
      this.themeMode = this.themeMode === 'light' ? 'dark' : 'light';
      this.cdr.detectChanges();
    }
  
    clearSelection(): void {
      this.selectedChannelId = '';
      this.selectedChannelName = '';
      this.messages = [];
      this.stopPollingMessages();
      this.cdr.detectChanges();
    }
  
    private startPollingMessages(): void {
      this.messagePollingSubscription = interval(15000).subscribe(() => {
        if (this.selectedChannelId) {
          this.http.get<any>(`${environment.apiUrl}/slack_integration?conversations=true&channel_id=${this.selectedChannelId}&token=${this.accessToken}`)
            .pipe(  
              tap(response => {
                if (response.success) {
                  const incoming = response.data.messages || [];
                  const newMessages = incoming.filter(msg => !this.messages.some(existing => existing.ts === msg.ts));
                  if (newMessages.length) {
                    this.messages = [...this.messages, ...newMessages];
                    this.messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
                    this.cdr.detectChanges();
                  }
                }
              }),
              catchError(() => of(null))
            ).subscribe();
        }
      });
    }
  
    private stopPollingMessages(): void {
      if (this.messagePollingSubscription) {
        this.messagePollingSubscription.unsubscribe();
        this.messagePollingSubscription = null;
      }
    }
  }
  