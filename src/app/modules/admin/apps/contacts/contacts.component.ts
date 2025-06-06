import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';
@Component({
  selector: 'contacts',
  templateUrl: './contacts.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactsComponent implements OnInit {
  contacts: any[] = [];
  filteredContacts: any[] = []; // Store filtered contacts
  errorMessage: string | null = null;
  sortBy: string = 'created_at'; // Default sorting by created_at
  sortDirection: string = 'DESC'; // Default sorting direction DESC
  searchControl = new FormControl(''); // Form control for search input
  searchFields: string[] = ['name', 'email', 'id', 'role', 'phone']; // Fields to search in
  loading: boolean = false;

  // Pagination variables
  currentPage: number = 1;
  itemsPerPage: number = 8;
  totalItems: number = 0;
get totalPages(): number {
  return Math.ceil(this.totalItems / this.itemsPerPage);
}

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ghlIntegrationService:GhlIntegrationService
  ) {}

  ngOnInit(): void {
    this.fetchContacts();
    
    // Subscribe to search input changes
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300), // Wait for 300ms pause in events
        distinctUntilChanged() // Only emit when the current value is different from the previous
      )
      .subscribe(value => {
        this.searchContacts(value);
      });
  }

  /**
   * Fetch contacts from the API
   */
 fetchContacts(): void {
  this.loading = true;

  // Get userType and locationId from GHL service
  this.ghlIntegrationService.getUserType().subscribe(userType => {
    const locationId =     this.ghlIntegrationService.getLocationId();
    console.log('User Type:', userType, 'Location ID:', locationId);

    let url = `${environment.apiUrl}/agents`;

    if (userType === 'Company' || userType === 'admin') {
      // Fetch all contacts for Company user type
      url = `${environment.apiUrl}/agents`; // no filter
    } else if (locationId) {
      // Filter contacts by location_id for other user types
      url = `${environment.apiUrl}/agents?location_id=${locationId}`;
    } else {
      // No locationId and not company user, show empty results
      this.contacts = [];
      this.filteredContacts = [];
      this.totalItems = 0;
      this.loading = false;
      this.cdr.detectChanges();
      console.log('No location ID available for non-company user - no contacts to display.');
      return; // Exit early
    }

    this.http.get<any>(url).subscribe({
      next: (data) => {
        console.log('API Response:', data);
        if (data && data.success && Array.isArray(data.data)) {
          this.contacts = data.data;
          this.filteredContacts = [...this.contacts];
          this.totalItems = this.contacts.length;
          this.sortContacts();
        } else {
          this.errorMessage = 'No contacts available';
          this.contacts = [];
          this.filteredContacts = [];
          this.totalItems = 0;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching contacts:', error);
        this.errorMessage = 'Error fetching contacts';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  });
}


  /**
   * Sort contacts based on selected criteria
   */
  sortContacts(): void {
    const { sortBy, sortDirection } = this;
    
    this.filteredContacts.sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      
      // Handle null/undefined values
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sortDirection === 'DESC' ? 1 : -1;
      if (valueB == null) return sortDirection === 'DESC' ? -1 : 1;
      
      // Special handling for date fields
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        return sortDirection === 'DESC' 
          ? new Date(valueB).getTime() - new Date(valueA).getTime()
          : new Date(valueA).getTime() - new Date(valueB).getTime();
      }
      
      // Handle string comparisons
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'DESC' 
          ? valueB.localeCompare(valueA)
          : valueA.localeCompare(valueB);
      }

      // Handle number comparisons
      return sortDirection === 'DESC' ? valueB - valueA : valueA - valueB;
    });
    
    this.updatePagination();
    this.cdr.detectChanges(); // Trigger change detection after sorting
  }

  /**
   * Toggle sort direction and update sorting
   */
  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'DESC' ? 'ASC' : 'DESC';
    this.sortContacts();
  }

  /**
   * Update sort field and trigger sort
   */
  updateSortField(field: string): void {
    // If clicking the same field, toggle direction
    if (this.sortBy === field) {
      this.toggleSort();
    } else {
      this.sortBy = field;
      this.sortContacts();
    }
  }

  /**
   * Search contacts based on input value
   * @param searchTerm The text to search for
   */
  searchContacts(searchTerm: string | null): void {
    if (!searchTerm || searchTerm.trim() === '') {
      // If search is empty, show all contacts
      this.filteredContacts = [...this.contacts];
    } else {
      const term = searchTerm.toLowerCase().trim();
      
      // Filter contacts that match the search term in any of the searchable fields
      this.filteredContacts = this.contacts.filter(contact => {
        return this.searchFields.some(field => {
          const value = contact[field];
          if (value === null || value === undefined) return false;
          
          // Convert field value to string and search
          return value.toString().toLowerCase().includes(term);
        });
      });
    }
    
    this.totalItems = this.filteredContacts.length;
    this.currentPage = 1; // Reset to first page on new search
    this.sortContacts(); // Re-sort the filtered results
    this.cdr.detectChanges();
  }

  /**
   * Get current page of contacts for pagination
   */
  get paginatedContacts(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredContacts.slice(startIndex, startIndex + this.itemsPerPage);
  }

  /**
   * Update pagination based on current state
   */
  updatePagination(): void {
    this.totalItems = this.filteredContacts.length;
    
    // Make sure current page is valid
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.currentPage > totalPages) {
      this.currentPage = Math.max(1, totalPages);
    }
  }

  /**
   * Change current page
   */
  setPage(page: number): void {
    if (page < 1) page = 1;
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (page > totalPages) page = totalPages;
    
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  /**
   * Get array of page numbers for pagination
   */
  get pageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // Basic case, show all pages if 7 or fewer
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Complex case, we need to show dots
    let pages: number[] = [1]; // Always show first page
    
    if (this.currentPage > 3) {
      pages.push(-1); // Add dots (represented by -1)
    }
    
    // Calculate range around current page
    const rangeStart = Math.max(2, this.currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, this.currentPage + 1);
    
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }
    
    if (this.currentPage < totalPages - 2) {
      pages.push(-1); // Add dots
    }
    
    pages.push(totalPages); // Always show last page
    
    return pages;
  }

  /**
   * Get display text for showing current range of items
   */
  get paginationDisplayText(): string {
    if (this.totalItems === 0) return 'No results';
    
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(startItem + this.itemsPerPage - 1, this.totalItems);
    
    return `Showing ${startItem} to ${endItem} of ${this.totalItems} results`;
  }

  /**
   * Clear search and show all contacts
   */
  clearSearch(): void {
    this.searchControl.setValue('');
  }
}