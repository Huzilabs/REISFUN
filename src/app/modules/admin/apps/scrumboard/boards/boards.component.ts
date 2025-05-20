



import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { MatDialog } from '@angular/material/dialog';
// import { PropertyDetailDialogComponent } from './property-detail-dialog.component';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';

interface Property {
  id: string;  
  title: string;
  description: string | null;
  status: string;
  price: string;
  property_type: string;
  created_at: string;
  created_by: string;
  agent_name: string;
  agent_phone_number: string;
  agent_email: string;
  zillow_link: string;
  bedrooms: number;
  bathrooms: number;
  sqft: string;
  lot_size: string;
  year_built: number;
  hoa: string;
  agent_remark: string;
  profit: string;
  inspection_period_end_date: string | null;
  totalrequests: string;
  coordinates: string;
  location_id: string;
  close_date: string | null;
  agent_id: string;
  attachments: PropertyAttachment[];
  update_lead: boolean;
}  

interface PropertyAttachment {
  id: string;
  lead_id: string;
  file_url: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  data: Property[];
}

@Component({
    selector       : 'scrumboard-boards',
    templateUrl    : './boards.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrumboardBoardsComponent implements OnInit, OnDestroy {
  // Property listing data
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  searchQuery = new FormControl('');
  statusFilter = new FormControl('all');
 // In your component.ts
statusOptions = [
  'all',
  'untouched',
  'initialcall',
  'needscomping',
  'tasktocomplete',
  'needsoffer',
  'specialneedsoffer',
  'feelthrough',
  'offersent',
  'buyersagent',
  'jvdeal',
  'dead',
  'listingremoved'
];

// Map status keys to nicely formatted labels
statusLabels: { [key: string]: string } = {
  all: 'All Statuses',
  untouched: 'Un Touched',
  initialcall: 'Initial Call',
  needscomping: 'Needs Comping',
  tasktocomplete: 'Task To Complete',
  needsoffer: 'Needs Offer',
  specialneedsoffer: 'Special Needs Offer',
  feelthrough: 'Feel Through',
  offersent: 'Offer Sent',
  buyersagent: 'Buyers Agent',
  jvdeal: 'JV Deal',
  dead: 'Dead',
  listingremoved: 'Listing Removed'
};
 isLoading = false;
  
  // Pagination settings
  pageSizeOptions: number[] = [5, 10, 25, 50, 100];
  pageSize = 10;
  pageIndex = 0;
  totalProperties = 0;
  paginatedProperties: Property[] = [];

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private router: Router,
  private ghlIntegrationService: GhlIntegrationService  // Inject here
  ) {}

  ngOnInit(): void {
    this.loadProperties();

    // Ensure initial data setup
    this.filteredProperties = [...this.properties];

    // Set up search and filter subscriptions with debounce
    this.searchQuery.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this._unsubscribeAll)
      )
      .subscribe(() => {
        this.pageIndex = 0; // Reset to first page when searching
        this.applyFilters();
      });

    this.statusFilter.valueChanges
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(() => {
        this.pageIndex = 0; // Reset to first page when filtering
        this.applyFilters();
      });
}

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  /**
   * Load properties from API
   */


 
  


// Following is the code to filter the MLS properties with Location ID 
 loadProperties(): void {
  this.isLoading = true;

  this.ghlIntegrationService.getUserType().pipe(takeUntil(this._unsubscribeAll)).subscribe(userType => {
    const locationId = this.ghlIntegrationService.getLocationId();
    console.log('User Type:', userType, 'Location ID:', locationId);

    let url = `${environment.apiUrl}/mls_leads?list=true&size=100`;

    if (userType === 'Company') {
      // Company user sees all deals
      url = `${environment.apiUrl}/mls_leads?list=true&size=100`;
    } else if (locationId) {
      // Filter deals by location_id for other users
      url = `${environment.apiUrl}/leads?list=true&size=100&location_id=${locationId}`;
    } else {
      // No location_id and not company, show empty list
      this.properties = [];
      this.filteredProperties = [];
      this.paginatedProperties = [];
      this.totalProperties = 0;
      this.isLoading = false;
      this.cdr.detectChanges();
      console.log('No location ID available for non-company user - no deals to display.');
      return; // Early exit
    }

    this.http.get<ApiResponse>(url)
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.properties = response.data || [];
            this.applyFilters();
          } else {
            this.properties = [];
            this.filteredProperties = [];
            this.paginatedProperties = [];
            this.totalProperties = 0;
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading properties:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  });
}


  // Apply search and status filters
  applyFilters(): void {
    const searchTerm = this.searchQuery.value?.toLowerCase() || '';
    const status = this.statusFilter.value || 'all';
  
    // Filter the properties based on search term and status
    this.filteredProperties = this.properties.filter(property => {
      const matchesSearch = !searchTerm || 
        property.title?.toLowerCase().includes(searchTerm) ||
        property.property_type?.toLowerCase().includes(searchTerm) ||
        (property.price && property.price.toString().includes(searchTerm));
  
      const matchesStatus = status === 'all' || property.status === status;
  
      return matchesSearch && matchesStatus;
    });
  
    this.totalProperties = this.filteredProperties.length;  // Update the total number of filtered properties
    this.updatePaginatedResults();  // Apply pagination logic
    this.cdr.detectChanges();  // Trigger change detection
  }
  
  updatePaginatedResults(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProperties = this.filteredProperties.slice(startIndex, endIndex);  // Slice based on current page and page size
  }
  


  /**
   * Handle page events from paginator
   */
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePaginatedResults();  // Update the paginated properties when the page changes
    this.cdr.detectChanges();  // Trigger change detection to reflect updates
  }
  
  /**
   * Update paginated results based on current page and page size
   */
 

  /**
   * Handle page size change from dropdown
   */
  onPageSizeChange(event: any): void {
    if (event && event.value) { // Ensure event and value exist
      this.pageSize = parseInt(event.value, 10);
      this.pageIndex = 0;  // Reset to the first page
      this.updatePaginatedResults();  // Recalculate the pagination
      this.cdr.detectChanges();  // Trigger change detection
    } else {
      console.error('Event or event.value is undefined', event);
    }
  }
  

  /**
   * Format price to currency
   */
  getFormattedPrice(price: string): string {
    if (!price) return '$0';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(parseFloat(price));
  }

  /**
   * Get property thumbnail image
   */
  getPropertyThumbnail(property: Property): string {
    if (property.attachments && property.attachments.length > 0) {
      return property.attachments[0].file_url;
    }
    return 'assets/images/property-placeholder.jpg';
  }    
  
  onPropertyClick(property: any): void {
    if (!property || !property.id) {
      console.error("Property is undefined or doesn't have an id", property);
      return; // Early exit if the property or id is not available
    }
    
    console.log("Navigating to propertydetails with ID:", property.id);
    this.router.navigate(['/pages/mlsdetails', property.id]);  // Navigate to the details page with the property id
  }
   
  /**
   * Open property details dialog
   */
 
  /**
   * Get CSS class for status badge
   */
  getStatusColor(status: string): string {
    if (!status) return 'bg-gray-500';
    
    switch (status.toLowerCase()) {
      case 'pre-marketing':
        return 'bg-purple-500';
      case 'active':
        return 'bg-green-400';   
        case 'closed':
          return 'bg-green-400';
      case 'pending':
        return 'bg-amber-500';
      case 'walkthrough':
        return 'bg-cyan-500';
      case 'completed':
        return 'bg-green-500';  
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Track by function for ngFor loops
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }  


onclickaddDeal(){
  this.router.navigate(['ui/colors'])
}

  // ADD Details Page

}    