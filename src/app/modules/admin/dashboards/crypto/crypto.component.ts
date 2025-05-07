import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment';
import { ApexOptions, ChartComponent } from 'ng-apexcharts';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { CryptoService } from 'app/modules/admin/dashboards/crypto/crypto.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'environments/environment';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ElementRef, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {  debounceTime } from 'rxjs/operators';

declare var google: any;  // Declare google object for TypeScript to recognize it
/// <reference types="google.maps" />

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
    selector       : 'crypto',
    templateUrl    : './crypto.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CryptoComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('btcChartComponent') btcChartComponent: ChartComponent;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    propertyDetails: any = null;
    propertyDetailsBackup: any = null;
    propertyId: string | null = null;
    loading: boolean = false;
    error: string | null = null;
    editMode: boolean = false;
    propertyForm: FormGroup;
    showCloseDealModal: boolean = false;
    profit: number = 0;
    properties: Property[] = [];

    paginatedProperties: Property[] = [];


    constructor(
        private _cryptoService: CryptoService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private route: ActivatedRoute,
        private fb: FormBuilder,
        private toastr: ToastrService,
        private http: HttpClient,
      private dialog: MatDialog,
      private cdr: ChangeDetectorRef,
      private router: Router

    ) {
        this.getalldetails();

    }


    ngOnInit(): void {
        this.propertyId = this.route.snapshot.paramMap.get('id');
        console.log("Property ID from URL:", this.propertyId);

        if (this.propertyId) {
            this.fetchPropertyDetails(this.propertyId);
        } else {
            this.error = 'Property ID is missing in the URL.';
            console.error(this.error);
            this._changeDetectorRef.markForCheck();
        }
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

    fetchPropertyDetails(propertyId: string) {
        this.loading = true;
        this.error = null;
        this._changeDetectorRef.markForCheck();

        this.http.get(`${environment.apiUrl}/leads?list=true&id=${propertyId}`)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                (result: any) => {
                    this.loading = false;
                    if (result?.data?.length > 0) {
                        this.propertyDetails = result.data[0];
                        this.propertyDetailsBackup = JSON.parse(JSON.stringify(this.propertyDetails));
                        this.initForm();
                    } else {
                        this.error = "No property details found";
                        this.propertyDetails = null;
                        console.error("Invalid API response format", result);
                    }
                    this._changeDetectorRef.markForCheck();
                },
                (error) => {
                    this.loading = false;
                    this.error = 'Error fetching property details';
                    console.error('Error fetching property details:', error);
                    this._changeDetectorRef.markForCheck();
                }
            );
    }

    initForm(): void {
        this.propertyForm = this.fb.group({
            title: [this.propertyDetails.title || ''],
            price: [this.propertyDetails.price || ''],
            profit: [this.propertyDetails.profit || ''],
            property_type: [this.propertyDetails.property_type || ''],
            bedrooms: [this.propertyDetails.bedrooms || ''],
            bathrooms: [this.propertyDetails.bathrooms || ''],
            cooling: [this.propertyDetails.cooling || ''],
            sqft: [this.propertyDetails.sqft || ''],
            lot_size: [this.propertyDetails.lot_size || ''],
            year_built: [this.propertyDetails.year_built || ''],
            units: [this.propertyDetails.units || ''],
            basement: [this.propertyDetails.basement || false],
            parking_spaces: [this.propertyDetails.parking_spaces || ''],
            zoning_type: [this.propertyDetails.zoning_type || ''],
            description: [this.propertyDetails.description || ''],
            zillow: [this.propertyDetails.zillow || '']
        });
    }

    toggleEditMode(): void {
        if (this.editMode) {
            this.propertyDetails = JSON.parse(JSON.stringify(this.propertyDetailsBackup));
        } else {
            this.initForm();
        }
        this.editMode = !this.editMode;
        this._changeDetectorRef.markForCheck();
    }

    saveChanges(): void {
      this.loading = true;
  
      // Include all required fields from the original property details
      const updatedDetails = {
          id: this.propertyId,
          ...this.propertyDetailsBackup, // Include all original fields
          ...this.propertyForm.value,    // Override with the form values
          update_lead: true
      };
  
      this.http.put(`${environment.apiUrl}/leads`, updatedDetails)
    .pipe(takeUntil(this._unsubscribeAll))
    .subscribe(
        (response: any) => {
            this.fetchPropertyDetails(this.propertyId!); // Force re-fetch to get fresh values
            this.editMode = false;
            this.toastr.success("Details Updated Successfully")
        },
        (error) => {
            this.loading = false;
            this.toastr.error = ( error)
            console.error('Error updating property:', error);
            this._changeDetectorRef.markForCheck();
        }
    );
  
  }

    cancelChanges(): void {
        this.propertyDetails = JSON.parse(JSON.stringify(this.propertyDetailsBackup));
        this.editMode = false;
        this._changeDetectorRef.markForCheck();
    }

    deleteProperty(): void {
      if (!this.propertyDetails?.id) {
        // console.error("No property ID found.");
        return;
      }
    
      // Show confirmation dialog first
      const confirmDelete = confirm('Are you sure you want to delete this property?');
      
      if (confirmDelete) {
        const deleteData = {
          id: this.propertyDetails.id
        };
        
        this.http.delete<any>(`${environment.apiUrl}/leads`, { body: deleteData })
          .subscribe(
            (response) => {
              console.log("Property Deleted Successfully:", response);

            this.router.navigate(['dashboards/deals'])
            // location.reload()
this.toastr.success("Deal deleted successfully")              
              // Navigate back to deals after deletion
              setTimeout(() => {
                this.router.navigate(['/deals']);
              }, 1000);
            },
            (error) => {
              console.error("Error deleting the property:", error);
            }
          );
      }
      // If user cancels the deletion, nothing happens
    }

    updateStatus(status: string): void {
        this.loading = true;
        const statusUpdate = { id: this.propertyId, status: status };

        this.http.patch(`${environment.apiUrl}/leads`, statusUpdate)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(
                (response: any) => {
                    this.loading = false;
                    this.propertyDetails.status = status;
                    this._changeDetectorRef.markForCheck();
                    this.toastr.success('Status updated successfully', 'Success');  

                },
                (error) => {
                    this.loading = false;

                    console.error('Error updating status:', error);
                    this._changeDetectorRef.markForCheck();
                    this.toastr.error('Failed to update status', 'Error');

                }
            );
    }

    openCloseDealModal(): void {
        this.showCloseDealModal = true;
        this.profit = this.propertyDetails.profit || 0;
        this._changeDetectorRef.markForCheck();
    }

    closeDeal(): void {  
      if (!this.propertyDetails?.id) {
          console.error("No property ID found.");
          return;
      }
  
      if (!this.profit || this.profit <= 0) {
          return;
      }
  
      const updateData = {
          id: this.propertyDetails.id,
          status: "closed",
          update_status: true,
          profit: this.profit.toFixed(2),
      };
  
      this.loading = true;
  
      this.http.patch<any>(`${environment.apiUrl}/leads`, updateData)
          .subscribe(
              (response) => {
                  console.log("Deal Closed Successfully:", response);
                  this.propertyDetails.status = "closed";
                  this.propertyDetails.profit = this.profit;

                 
  
                  this.loading = false;
                  this.showCloseDealModal = false;
                  location.reload();

                  this.toastr.success('Status updated successfully', 'Success');  

                  // Optional cleanup or redirection
              },
              (error) => {
                  this.loading = false;
this.toastr.error('error in closing the deal', error) 
                 this._changeDetectorRef.markForCheck();
              }
          );
  }
  
    formatPrice(price: string | number | null | undefined): string {
        if (price === null || price === undefined) {
            return 'N/A';
        }
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price));
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // Google Maps Integration
   
  propertydetails: any[] = [];
  markers: google.maps.Marker[] = [];  // Store property markers


  @ViewChild('mapContainer', { static: true }) mapElement!: ElementRef;
  @ViewChild('searchBox', { static: true }) searchBoxElement!: ElementRef;

  map!: google.maps.Map;
  marker!: google.maps.Marker; // main marker
  placesService!: google.maps.places.PlacesService;

  ngAfterViewInit() {
    if (typeof google === 'undefined' || !google.maps) {
      console.error('Google Maps API not loaded!');
      return;
    }
  
    // Initialize Map with a default center.
    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: { lat: 37.7749, lng: -122.4194 },
      zoom: 16,
      streetViewControl: false
    });
  
    // Initialize the main marker (draggable).
    this.marker = new google.maps.Marker({
      position: this.map.getCenter(),
      map: this.map,
      draggable: true,
      title: "Main Marker"
    });
  
    // Initialize PlacesService.
    this.placesService = new google.maps.places.PlacesService(this.map);
  
    // Set up Autocomplete.
    const inputElement = this.searchBoxElement.nativeElement as HTMLInputElement;
    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
      types: ['geocode'],
      componentRestrictions: { country: 'us' }
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        console.error("No geometry available for place.");
        return;
      }
      this.map.setCenter(place.geometry.location);
      this.map.setZoom(18);
      this.marker.setPosition(place.geometry.location);
    });
  
    // Add custom street view button.
    this.addCustomStreetViewButton();
    this.getalldetails();
    

  }
  
  addCustomStreetViewButton() {
    const streetViewControlDiv = document.createElement("div");
    streetViewControlDiv.classList.add("street-view-container");

    // Create Pegman Image.
    const pegmanImage = document.createElement("img");
    pegmanImage.id = "pegmanImage";
    pegmanImage.src = "assets/images/logo/logo.svg";
pegmanImage.classList.add("w-40", "h-82", "border-2", "border-red-600", "mb-5", "ml-2");

  
    // Create Fullscreen Image.
    const fullscreenImage = document.createElement("img");
    fullscreenImage.src = "fullscreen.svg"; // Ensure this image exists in your assets.
    fullscreenImage.classList.add("fullscreen-icon");

    // Create Text Overlay.
    const textOverlay = document.createElement("div");
    textOverlay.id = "pegmanText";
    textOverlay.innerText = "Street View";
    textOverlay.classList.add("street-view-text");

    // Toggle Fullscreen Mode on click.
    fullscreenImage.addEventListener("click", () => {
      if (pegmanImage.requestFullscreen) {
        pegmanImage.requestFullscreen();
      } else if ((pegmanImage as any).webkitRequestFullscreen) { 
        (pegmanImage as any).webkitRequestFullscreen();
      } else if ((pegmanImage as any).msRequestFullscreen) { 
        (pegmanImage as any).msRequestFullscreen();
      }
    });

    // Append the elements.
    streetViewControlDiv.appendChild(pegmanImage);
    streetViewControlDiv.appendChild(textOverlay);
    streetViewControlDiv.appendChild(fullscreenImage);

    streetViewControlDiv.addEventListener("click", () => {
      const streetView = this.map.getStreetView();
      streetView.setPosition(this.marker.getPosition() as google.maps.LatLng);
      streetView.setVisible(true);
    });

    // Add custom control to the map.
    this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(streetViewControlDiv);
  }  
  
  getalldetails() {
    this.http.get(`${environment.apiUrl}/leads?list=true`)
      .subscribe((result: any) => {
        console.log("API Response:", result);
        
        if (!result || !result.data || !Array.isArray(result.data)) {
          console.error("Invalid API response format:", result);
          return;
        }
        
        this.propertydetails = result.data
          .filter((property: any) => property.status === "closed")
          .map((property: any) => ({
            ...property,
            imageUrl: property.attachments && property.attachments.length > 0 
              ? property.attachments[0].file_url
              : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWKC-0QJX6hQTAavxdKuvHoh5t6eKkR2WM0Q&s"  
          }));
  
        console.log("Filtered property details:", this.propertydetails);
        console.log("Number of properties to add markers for:", this.propertydetails.length);
        
        if (this.propertydetails.length === 0) {
          console.warn("No properties with 'closed' status found");
        }
  
        // Clear existing markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
  
        // For each property, add a marker
        this.propertydetails.forEach((property, index) => {
          console.log(`Adding marker for property ${index}:`, property);
          this.addMarkerForProperty(property);
        });
      }, error => {
        console.error("Error fetching property details:", error);
      });
  }
  
  /**
   * Updates map bounds to include all markers.
   */
  updateMapBounds(): void {
    if (this.markers.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(marker => {
      const pos = marker.getPosition();
      if (pos) {
        bounds.extend(pos);
      }
    });
    this.map.fitBounds(bounds);
  }
  
  /**
   * Adds a marker for a given property, attaches hover InfoWindow,
   * and on click, re-centers the integrated map to that property.
   */
  addMarkerForProperty(property: any): void {
    // If property already includes coordinates, use them.
    if (property.latitude && property.longitude) {
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid lat/lng for property:", property);
        return;
      }
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: property.title
      });
      this.addHoverInfoWindow(marker, property);
      // On click, re-center the integrated map to this marker.
      marker.addListener("click", () => {
        const pos = marker.getPosition();
        if (pos) {
          this.map.setCenter(pos);
          this.map.setZoom(18.5);
        }
      });
      this.markers.push(marker);
      this.updateMapBounds();
      return;
    }
    
    // Fallback: try to geocode an address.
    const address = property.address ||
                    (property.location && property.location.address) ||
                    property.formatted_address ||
                    property.fullAddress ||
                    property.title;
    if (!address) {
      console.warn("No address available for property:", property);
      return;
    }
    console.log("Using address for geocoding:", address);

    const apiKey = 'AIzaSyBwi9FZr8s86oj62YybfjxiOA3Qu3B87cc';
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    this.http.get(geocodeUrl)
      .subscribe((geocodeResponse: any) => {
        if (geocodeResponse.status === "OK" && geocodeResponse.results && geocodeResponse.results.length > 0) {
          const location = geocodeResponse.results[0].geometry.location;
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lng);
          if (isNaN(lat) || isNaN(lng)) {
            console.error("Invalid lat/lng from geocoding for property:", property);
            return;
          }
          const marker = new google.maps.Marker({
            position: { lat, lng },
            map: this.map,
            title: property.title
          });
          this.addHoverInfoWindow(marker, property);
          // On click, re-center the map to this marker.
          marker.addListener("click", () => {
            const pos = marker.getPosition();
            if (pos) {
              this.map.setCenter(pos);
              this.map.setZoom(18.5);
            }
          });
          this.markers.push(marker);
          this.updateMapBounds();
        } else {
          console.error("Geocode API error for property", property, geocodeResponse.status);
        }
      }, error => {
        console.error("Error fetching geocode for property", property, error);
      });
  }
  
  /**
   * Attaches an InfoWindow that shows property details (with an image if available)
   * on marker hover.
   */
  addHoverInfoWindow(marker: google.maps.Marker, property: any): void {
    const imageHtml = property.attachments && property.attachments.length > 0
    ? `<span >
         <img src="${property.attachments[0].file_url}" alt="Property Image" style="max-width:100%; display:block; margin-bottom:6px;margin-top:10px;border-radius:7px">
       </span>`
    : '';
    const infoContent = `
      <div style="width:230px;border-radius:10px">
      <p style="margin:0 0 0 0; width:100%; font-size:13px; font-weight:bold;font-family:Times New Roman"  >${property.title || ''}</p>
          
      ${imageHtml}

        <div style="font-size:14px; color:black;">
          <p style="margin-top:10px;font-size:13px; font-family:Times New Roman;"><font style="font-weight:bold">Price:</font> <strong>${property.price || ''}</strong></p>
          <p style="margin-top:10px;font-size:13px; font-family:Times New Roman;"><font style="font-weight:bold">Agent Name:</font> <strong>${property.agent_name || ''}</strong></p>
          <p style="margin-top:10px;font-size:13px; font-family:Times New Roman;"><font style="font-weight:bold">Coordinates:</font> <strong>${property.coordinates || ''}</strong></p>
        </div>
      </div>  
    `;
    const infoWindow = new google.maps.InfoWindow({
      content: infoContent
    });
    
    infoWindow.addListener("domready", () => {
      // Use a small timeout to ensure the DOM is fully rendered.
      setTimeout(() => {
        // Try to select the close button using both title and aria-label selectors.
        const closeBtn = document.querySelector('button[title="Close window"]') ||
                         document.querySelector('button[aria-label="Close"]');
        if (closeBtn) {
          closeBtn.setAttribute("style", "display: none !important;");
        }
      }, 100);
    });
  
    marker.addListener("mouseover", () => {
      infoWindow.open({
        anchor: marker,
        map: this.map,
        shouldFocus: false,
      });
    });
    marker.addListener("mouseout", () => {
      infoWindow.close();
    });
  }
  
  
  searchProperty(title: string) {
    if (!this.searchBoxElement || !this.placesService) {
      console.error("SearchBox element or PlacesService is not available.");
      return;
    }
    const inputElement = this.searchBoxElement.nativeElement as HTMLInputElement;
    inputElement.value = title;
    
    const selectedProperty = this.propertydetails.find((property) => property.title === title);
    if (selectedProperty) {
      const pegmanImage = document.querySelector("#pegmanImage") as HTMLImageElement;
      if (pegmanImage) {
        pegmanImage.src = selectedProperty.imageUrl;
      }
    }
    
    this.placesService.findPlaceFromQuery(
      { query: title, fields: ["geometry", "name"] },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const place = results[0];
          if (place.geometry && place.geometry.location) {
            this.map.setCenter(place.geometry.location);
            this.map.setZoom(18.5);
            this.marker.setPosition(place.geometry.location);
          }
        } else {
          console.error("No place found for:", title);
        }
      }
    );
  }




  // Slider Properties
   
    filteredProperties: Property[] = [];
    searchQuery = new FormControl('');
    statusFilter = new FormControl('all');
    statusOptions = ['all', 'pre-marketing', 'active', 'pending', 'walkthrough', 'completed', 'cancelled'];
    isLoading = false;
    
    // Pagination settings
    pageSizeOptions: number[] = [5, 10, 25, 50, 100];
    pageSize = 10;
    pageIndex = 0;
    totalProperties = 0;
  
  
 
  
    
  
    
  
    /**
     * Load properties from API
     */
    loadProperties(): void {
      this.isLoading = true;
      this.http.get<ApiResponse>(`${environment.apiUrl}/leads?list=true&size=100`)
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
      this.router.navigate(['/dashboards/propertydetails', property.id]);  // Navigate to the details page with the property id
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
    this.router.navigate(['dashboards/adddeals'])
  }
  
}