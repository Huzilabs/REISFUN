import { ChangeDetectionStrategy, Component, OnInit, ViewChild, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Router } from '@angular/router';

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
        private router:Router
    ) {}

    /**
     * On init
     */
    ngOnInit(): void {
        // Initialize calendar options with enhanced styling
        this.calendarOptions = {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            slotDuration: '01:00:00', // 1-hour slots
            slotLabelFormat: {
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                meridiem: 'short'
            },
            height: 'auto',
            contentHeight: 900, // Increased content height for better visibility
            aspectRatio: 1.8,
            themeSystem: 'bootstrap',
            editable: false,
            selectable: true,
            selectMirror: true,
            weekends: true,
            nowIndicator: true,
            allDaySlot: false,
            scrollTime: '06:00:00', // Start scrolled to 6am
            eventClick: this.handleEventClick.bind(this),
            eventClassNames: 'shadow-sm',
            eventMinHeight: 120, // Increased minimum height for events to 120px
            dayCellClassNames: 'hover:bg-gray-100',
            viewDidMount: () => {
                // Add custom styling after view is mounted
                this.applyCustomStyling();
            },
            events: (info, successCallback) => {
                successCallback(this.events);
            },
            eventTimeFormat: { 
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short',
                weekday: false, 
                year: false, 
                month: false, 
                day: false
            },
            eventContent: (arg) => {
                // Only show the event title, not the time or date
                return { 
                    html: `<div class="fc-event-title">${arg.event.title}</div>` 
                };
            }
        };
        
        
        
        // Load events from API
        this.loadEvents();
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
                    price: lead.price
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
            price: info.event.extendedProps?.price
            
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
    
}