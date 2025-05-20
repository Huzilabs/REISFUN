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
    rep_deal_id: string;
    lead_gen:string;
    joint_partner_info:string;
    buyer_walkin_appointments:string;
    deal_text:string;
    is_assignable:string;
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
othersDropdownOpen = false;




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
            zillow: [this.propertyDetails.zillow || ''],
            agent_name: [this.propertyDetails.agent_name || ''],
            agent_email: [this.propertyDetails.agent_email || ''],
            agent_phone: [this.propertyDetails.agent_phone || ''],

             rep_deal_id: [this.propertyDetails.rep_deal_id || ''],
    lead_gen:[this.propertyDetails.lead_gen || ''],
    joint_partner_info:[this.propertyDetails.joint_partner_info || ''],
    buyer_walkin_appointments:[this.propertyDetails.buyer_walkin_appointments || ''],
    deal_text:[this.propertyDetails.deal_text || ''],
    is_assignable:[this.propertyDetails.is_assignable || ''],
    



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
        const statusUpdate = { id: this.propertyId, status: status, update_status: true };
  
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
    
    const infoContent = `
    <div style="width:300px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.1); padding:10px; font-family:'Arial', sans-serif; background-color:#fff;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <a href="${property.zillow || '#'}" target="_blank" style="display:flex; align-items:center; text-decoration:none; color:#0077e6; font-weight:500; font-size:15px; transition:color 0.2s; padding:4px 10px; border-radius:4px; background-color:#f0f7ff;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
            <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V9L14 3H6z"></path>
            <path d="M14 3v6h6"></path>
          </svg>
          Zillow
        </a>
        <div style="display:flex; align-items:center; font-size:14px; color:#596b82; background-color:#f5f7fa; padding:4px 12px; border-radius:16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>${property.property_type || 'Residential'}</span>
        </div>
      </div>
      
      <div style="font-size:18px; font-weight:600; color:#333; margin-bottom:14px; line-height:1.3;">
        ${property.title || 'Property Address'}
      </div>
      
      <div style="display:flex; align-items:center; font-size:15px; color:#444; background-color:#f8f9fa; padding:10px; border-radius:8px;">
        <div style="display:flex; align-items:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
            <path d="M3 22v-7"></path>
            <path d="M21 22v-7"></path>
            <path d="M3 8v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8"></path>
            <path d="M5 2h14a2 2 0 0 1 2 2v4H3V4a2 2 0 0 1 2-2z"></path>
          </svg>
          <span style="font-weight:500">${property.bedrooms || '0'} beds</span>
        </div>
        <span style="margin:0 8px; color:#ddd">|</span>
        <div style="display:flex; align-items:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
            <path d="M21 13v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"></path>
          </svg>
          <span style="font-weight:500">${property.bathrooms || '0'} baths</span>
        </div>
        <span style="margin:0 8px; color:#ddd">|</span>
        <div style="display:flex; align-items:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M3 9h18"></path>
            <path d="M9 21V9"></path>
          </svg>
          <span style="font-weight:500">${property.sqft || '0'} sqft</span>
        </div>
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
  

repDealButtonClicked(name: string): void {
  if (!this.propertyDetails || !this.propertyId) {
    console.error('Property details or ID missing');
    return;
  }

  this.loading = true;

  const updatePayload = {
    ...this.propertyDetails,
    id: this.propertyId,
    rep_deal_id: name,
    update_lead: true
  };

  console.log('Sending update payload:', JSON.stringify(updatePayload, null, 2));

  this.http.put(`${environment.apiUrl}/leads`, updatePayload).subscribe({
    next: (response) => {
      console.log('Backend response:', response);
      this.propertyDetails.rep_deal_id = name;
      this.propertyForm.controls['rep_deal_id'].setValue(name);
      this.toastr.success('REP DEAL ID updated successfully');
      this.loading = false;
      location.reload()
    },
    error: (error) => {
      console.error('Update error:', error);
      if(error.error) {
        console.error('Backend error message:', error.error);
      }
      this.toastr.error('Failed to update REP DEAL ID');
      this.loading = false;
    }
  });
}


leadGenButtonClicked(status: string): void {
  if (!this.propertyDetails || !this.propertyId) {
    console.error('Property details or ID missing');
    return;
  }

  this.loading = true;

  const updatePayload = {
    ...this.propertyDetails,  // Include all current fields (required by backend)
    id: this.propertyId,      // Explicitly include ID
    lead_gen: status,         // Override lead_gen with selected status
    update_lead: true         // Backend flag to trigger update (if required)
  };

  console.log('Sending update payload for lead_gen:', JSON.stringify(updatePayload, null, 2));

  this.http.put(`${environment.apiUrl}/leads`, updatePayload).subscribe({
    next: (response) => {
      console.log('Backend response:', response);
      this.propertyDetails.lead_gen = status;
      this.propertyForm.controls['lead_gen'].setValue(status);
      this.toastr.success('Lead Gen updated successfully');
      this.loading = false;
      location.reload()
    },  
    error: (error) => {
      console.error('Update error:', error);
      if (error.error) {
        console.error('Backend error message:', error.error);
      }
      this.toastr.error('Failed to update Lead Gen');
      this.loading = false;
    }
  });
}



isImage(fileType: string): boolean {
  if (!fileType) return false;
  const imageTypes = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp'];
  return imageTypes.includes(fileType.toLowerCase());
}

isPdf(fileType: string): boolean {
  if (!fileType) return false;
  return fileType.toLowerCase() === 'pdf';
}

isDoc(fileType: string): boolean {
  if (!fileType) return false;
  const lowerType = fileType.toLowerCase();
  return lowerType === 'msword' || lowerType === 'doc' || lowerType === 'docx' || lowerType.includes('wordprocessingml');
}

extractFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
  } catch {
    return url;
  }
}


}