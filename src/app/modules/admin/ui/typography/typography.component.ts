import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
// import { HttpClient } from '@azure/core-http';
import { environment } from 'environments/environment';
/// <reference types="google.maps" />
import { HttpClient } from '@angular/common/http';

@Component({
    selector     : 'typography',
    templateUrl  : './typography.component.html',
    encapsulation: ViewEncapsulation.None
})  
export class TypographyComponent
{
    propertydetails: any[] = [];
    markers: google.maps.Marker[] = [];  // Store property markers
  
    constructor(private http: HttpClient, private router: Router) {
      this.getalldetails();
    }
  
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
    }
    
    addCustomStreetViewButton() {
      const streetViewControlDiv = document.createElement("div");
      streetViewControlDiv.classList.add("street-view-container");
  
      // Create Pegman Image.
      const pegmanImage = document.createElement("img");
      pegmanImage.id = "pegmanImage";
      pegmanImage.src = "assets/images/logo/logo.svg";
      pegmanImage.classList.add("pegman-image");
      pegmanImage.classList.add("w-40", "h-82", "border-2", "border-red-600", "mb-5", "ml-2");

  
      // Create Fullscreen Image.
      const fullscreenImage = document.createElement("img");
      fullscreenImage.src = "fullscreen.svg"; // Ensure this image exists in your assets.
      fullscreenImage.classList.add("fullscreen-icon");
  
      // Create Text Overlay.
      const textOverlay = document.createElement("div");
      textOverlay.id = "pegmanText";
      textOverlay.innerText = "";
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
          this.propertydetails = result.data
            .filter((property: any) => property.status === "closed")
            .map((property: any) => ({
              ...property,  
              imageUrl: property.attachments && property.attachments.length > 0 
                ? property.attachments[0].file_url
                : "default-image.jpg"
            }));
  
          console.log("Property details:", this.propertydetails);
  
          // For each property, add a marker.
          this.propertydetails.forEach(property => {
            this.addMarkerForProperty(property);
          });
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
    getFormattedPrice(price: string): string {
        if (!price) return '$0';
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(parseFloat(price));
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
    onclickaddDeal(){
        this.router.navigate(['dashboards/adddeals'])
      }
      trackByFn(index: number, item: any): any {
        return item.id || index;
      }
         
      getPropertyThumbnail(property: Property): string {
        if (property.attachments && property.attachments.length > 0) {
          return property.attachments[0].file_url;
        }
        return 'assets/images/property-placeholder.jpg';
      }
      
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
}
  

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
