import { ChangeDetectionStrategy, Component, OnInit, ViewChild, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleCalendarService } from 'app/shared/googlecalendar.service';

interface EventInput {
    id: string;
    title: string;
    start: Date | string;
    end?: Date | string | null;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    extendedProps?: any;
}

@Component({
    selector: 'tasks',
    templateUrl: './tasks.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent implements OnInit {
    @ViewChild('calendar') calendarComponent: FullCalendarComponent;
    
    calendarOptions: any;
    events: EventInput[] = [];
    selectedEvent: any = null;
    loading = false;
    private popupWindow: Window | null = null;

    // Updated color palette to match the screenshot
    statusColors = {
        'active': '#00a88f',        // Teal/Green color for active
        'pre marketing': '#ef6f76', // Red for pre marketing
        'pending': '#ffc107',       // Yellow for pending
        'closed': '#00a88f',        // Purple for closed
        'default': '#00a88f'        // Default color
    };

    /**
     * Constructor
     */
    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
        private router: Router,
        public googleCalendarService: GoogleCalendarService,
        private route: ActivatedRoute
    ) {}

    /**
     * On init
     */
    tokenAvailable = true;
    showingGoogleCalendar = false;

    ngOnInit(): void {
        // Setup message listener for popup OAuth
        this.setupPopupMessageListener();

        // Setup FullCalendar
        this.calendarOptions = {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            slotDuration: '01:00:00',
            slotLabelFormat: {
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                meridiem: 'short'
            },
            height: 'auto',
            contentHeight: 900,
            aspectRatio: 1.8,
            themeSystem: 'bootstrap',
            editable: false,
            selectable: true,
            selectMirror: true,
            weekends: true,
            nowIndicator: true,
            allDaySlot: false,
            scrollTime: '06:00:00',
            eventClick: this.handleEventClick.bind(this),
            eventClassNames: 'shadow-sm',
            eventMinHeight: 120,
            dayCellClassNames: 'hover:bg-gray-100',
            viewDidMount: () => this.applyCustomStyling(),
            events: (info, successCallback) => successCallback(this.events),
            eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'                       
            },
            eventContent: (arg) => ({
                html: `<div class="fc-event-title">${arg.event.title}</div>`
            })
        };

        // Check if token already exists in storage
        const storedToken = this.googleCalendarService.getStoredToken();

        if (storedToken) {
            console.log('[TasksComponent] Using stored Google token');
            this.tokenAvailable = true;
            this.showingGoogleCalendar = true;
            this.loadGoogleCalendarEvents();
        } else {
            console.log('[TasksComponent] No Google token found, loading internal leads calendar');
            this.tokenAvailable = false;
            this.showingGoogleCalendar = false;
            this.loadEvents();
        }
    }

    /**
     * Setup message listener for popup OAuth callback
     */
    private setupPopupMessageListener(): void {
        window.addEventListener('message', (event) => {
            // In production, restrict this to your domain
            // if (event.origin !== 'https://yourdomain.com') return;

            if (event.data && event.data.type === 'oauth-code') {
                console.log('[TasksComponent] Received OAuth code from popup:', event.data.code);
                
                // Close the popup
                if (this.popupWindow) {
                    this.popupWindow.close();
                    this.popupWindow = null;
                }

                // Exchange code for token
                this.handleOAuthCode(event.data.code);
            }
        });
    }

    /**
     * Handle OAuth code received from popup
     */
    private handleOAuthCode(code: string): void {
        this.googleCalendarService.getAccessToken(code).subscribe({
            next: token => {
                console.log('[TasksComponent] Google token received and will be stored');
                this.googleCalendarService.storeToken(token);

                // Update UI state
                this.tokenAvailable = true;
                this.showingGoogleCalendar = true;

                // Load Google Calendar Events
                this.loadGoogleCalendarEvents();
            },
            error: err => {
                console.error('[TasksComponent] Failed to exchange Google token:', err);

                // Fallback to internal calendar
                this.tokenAvailable = false;
                this.showingGoogleCalendar = false;
                this.loadEvents();
            }
        });
    }

    loadGoogleCalendarEvents(): void {
        this.loading = true;
        this.googleCalendarService.fetchCalendarEvents().subscribe({
            next: (response: any) => {
                if (response.success && Array.isArray(response.data)) {
                    console.log('[TasksComponent] Google Calendar events loaded:', response.data);
                    this.events = this.transformGoogleEvents(response.data);
                    this.refreshCalendar();
                } else {
                    console.warn('[TasksComponent] Unexpected Google events response:', response);
                }

                this.loading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('[TasksComponent] Failed to load Google Calendar events:', err);
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

   transformGoogleEvents(googleEvents: any[]): any[] {
  return googleEvents.map(event => {
    const isAllDay = !!event.start.date;

    const start = isAllDay ? event.start.date : event.start.dateTime;
    let end = isAllDay ? event.end?.date : event.end?.dateTime;

    // Adjust end date for all-day events
    if (isAllDay && end) {
      const adjusted = new Date(end);
      adjusted.setDate(adjusted.getDate() - 1);
      end = adjusted.toISOString().split('T')[0];
    }

    // Capture the "created" timestamp from the Google Calendar event metadata
    const createdTime = event.created;  // The "created" time of the event in Google Calendar

    return {
      id: event.id,
      title: event.summary || '(No Title)',
      start,
      end,
      allDay: isAllDay,
      backgroundColor: '#4285F4',
      borderColor: '#4285F4',
      textColor: '#ffffff',
      extendedProps: {
        link: event.htmlLink,
        creator: event.creator?.email,
        visibility: event.visibility,
        status: event.status,
        eventType: event.eventType,
        createdTime: createdTime  // Store the created time in extendedProps
      }
    };
  });
}


    refreshCalendar(): void {
        if (this.calendarComponent?.getApi) {
            this.calendarComponent.getApi().removeAllEvents();
            this.calendarComponent.getApi().addEventSource(this.events);
        }
    }

    /**
     * Apply custom styling to calendar elements
     */
    applyCustomStyling(): void {
        // Highlight current day column
        const todayColumn = document.querySelector('.fc-day-today');
        if (todayColumn) {
            todayColumn.classList.add('bg-blue-50');
        }
        
        // Style the buttons
        const buttons = document.querySelectorAll('.fc-button');
        buttons.forEach(button => {
            button.classList.add('transition-all', 'hover:scale-105');
        });
        
        // Style the week button to match our new red color
        const weekButton = document.querySelector('.fc-timeGridWeek-button');
        if (weekButton && weekButton.classList.contains('fc-button-active')) {
            weekButton.classList.add('bg-red-500', 'border-red-500');
            weekButton.setAttribute('style', `background-color: ${this.statusColors['pre marketing']} !important; border-color: ${this.statusColors['pre marketing']} !important;`);
        }

        // Style event elements to match your design and ensure they have sufficient height
        const eventElements = document.querySelectorAll('.fc-event');
        eventElements.forEach(event => {
            event.classList.add('rounded-sm', 'px-2', 'py-2', 'text-sm');
            
            // Add minimum height to make events taller and more visible
            event.setAttribute('style', event.getAttribute('style') + '; min-height: 120px !important; height: auto !important;');
            
            // Make title text bold for better visibility
            const titleElement = event.querySelector('.fc-event-title');
            if (titleElement) {
                titleElement.classList.add('font-bold');
            }
        });
    }

    /**
     * Load events from API
     */
    loadEvents(): void {
        this.loading = true;
        this.http.get(`${environment.apiUrl}/leads?list=true`)
            .subscribe({
                next: (response: any) => {
                    console.log('API Response:', response);
                    
                    // Check if the data is in the expected format
                    const leadsData = response.data || [];
                    console.log('Leads data:', leadsData);
                    
                    // Transform the data into calendar events
                    this.events = this.transformLeadsData(leadsData);
                    console.log('Transformed events:', this.events);
                    
                    // After loading events, refresh the calendar
                    if (this.calendarComponent?.getApi) {
                        this.calendarComponent.getApi().refetchEvents();
                        this.applyCustomStyling();
                    }
                    
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    console.error('Error loading leads from API:', error);
                    this.loading = false;
                    this.cdr.markForCheck();
                }
            });
    }
  
    /**
     * Transform API data into calendar events
     */
    transformLeadsData(apiData: any[]): EventInput[] {
        if (!apiData || !Array.isArray(apiData)) {
            console.warn('Invalid data format received from API');
            return [];
        }
        
        return apiData.map(lead => {
            // Use created_at date as the event date
            const eventDate = lead.created_at ? new Date(lead.created_at) : new Date();
            
            // Set end time to be 2 hours after start time to ensure events have more height
            const endDate = new Date(eventDate);
            endDate.setHours(endDate.getHours() + 2); // Increased from 1 to 2 hours
            
            // Determine color based on status
            const status = (lead.status || '').toLowerCase();
            const backgroundColor = this.statusColors[status] || this.statusColors.default;
            
            // Format property details (no MLS number)
            const propertyDetails = [
                lead.bedrooms ? `${lead.bedrooms} bed` : '',
                lead.bathrooms ? `${lead.bathrooms} bath` : '',
                lead.sqft ? `${Number(lead.sqft).toLocaleString()} sqft` : ''
            ].filter(detail => detail).join(' · ');
            
            // Create event title with price if available
            const title = `${lead.title || 'Property'}`;
    const createdTime = (event as any).created;  // Casting to 'any' to access the 'created' property

            // Returning the event object for FullCalendar
            return {
                id: lead.id,
                title: title,
                start: eventDate, // Start date for the event (time not included in title)
                end: endDate, // Ensure end date is set correctly for duration
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                textColor: '#ffffff',
                extendedProps: {
                    leadId: lead.id,
                    description: lead.description,
                    propertyType: lead.property_type,
                    status: lead.status,
                    location: lead.coordinates,
                    agent: lead.agent_name,
                    propertyDetails: propertyDetails,
                    thumbnail: lead.attachments && lead.attachments[0]?.file_url,
                    mlsNumber: lead.mls_number,
                    price: lead.price,  
                            createdTime: createdTime  // Store the created time in extendedProps

                }
            };
        });
    }

    /**
     * Handle event click to show details
     */
    handleEventClick(info: { event: any }): void {
        this.selectedEvent = {
            id: info.event.id,
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            status: info.event.extendedProps?.status,
            description: info.event.extendedProps?.description,
            propertyType: info.event.extendedProps?.propertyType,
            agent: info.event.extendedProps?.agent,
            propertyDetails: info.event.extendedProps?.propertyDetails,
            thumbnail: info.event.extendedProps?.thumbnail,
            mlsNumber: info.event.extendedProps?.mlsNumber,
            price: info.event.extendedProps?.price,
                createdTime: info.event.extendedProps?.createdTime  // Add created time to selectedEvent

        };
        this.cdr.markForCheck();
    }

    /**
     * Close event details dialog
     */
    closeEventDetails(): void {
        this.selectedEvent = null;
        this.cdr.markForCheck();
    }

    showEventDetails(): void {
        if (this.selectedEvent) {
            // Navigate to the property details page using the event's id
            this.router.navigate([`/dashboards/propertydetails/${this.selectedEvent.id}`]);
        }
        this.selectedEvent = null;
        this.cdr.markForCheck();
    }

    /**
     * Connect to Google using popup window
     */
    connectToGoogle(): void {
        console.log('[TasksComponent] connectToGoogle() clicked - opening popup');

        // Get the OAuth URL from your service
        const oauthUrl = this.googleCalendarService.getOAuthUrl();
        
        // Open popup window
        this.popupWindow = window.open(
            oauthUrl,
            'google-oauth',
            'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Check if popup was blocked
        if (!this.popupWindow) {
            alert('Popup blocked! Please allow popups for this site and try again.');
            return;
        }

        // Optional: Check if popup is closed manually
        const checkClosed = setInterval(() => {
            if (this.popupWindow?.closed) {
                clearInterval(checkClosed);
                console.log('[TasksComponent] Popup was closed manually');
                this.popupWindow = null;
            }
        }, 1000);
    }

    showingGoogleEvents = false;

    switchToGoogleCalendar(): void {
        this.showingGoogleEvents = true;
        this.loadGoogleCalendarEvents();
    }

    switchToInternalCalendar(): void {
        this.showingGoogleEvents = false;
        this.loadEvents();
    }

    switchToGoogle(): void {
        console.log('[TasksComponent] Switching to Google Calendar');
        this.showingGoogleCalendar = true;
        this.loadGoogleCalendarEvents();
    }

    switchToLeads(): void {
        console.log('[TasksComponent] Switching to Leads Calendar');
        this.showingGoogleCalendar = false;
        this.loadEvents();
    }

    logoutFromGoogle(): void {
        this.googleCalendarService.clearToken();
        this.tokenAvailable = false;
        this.showingGoogleCalendar = false;
        this.loadEvents();
    }

    toggleCalendar(): void {
        this.showingGoogleCalendar = !this.showingGoogleCalendar;
        if (this.showingGoogleCalendar) {
            this.switchToGoogle();
        } else {
            this.switchToLeads();
        }
    }
}