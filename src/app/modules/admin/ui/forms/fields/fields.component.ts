import { Component, ViewEncapsulation, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { Azureblobservice } from 'app/shared/azureblobservice.service';
import { environment } from 'environments/environment';

@Component({
  selector: 'forms-fields',
  templateUrl: './fields.component.html',
  encapsulation: ViewEncapsulation.None
})
export class FormsFieldsComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapElement!: ElementRef;
  @ViewChild('searchBox', { static: false }) searchBoxElement!: ElementRef;
  @ViewChild('zillowInput') zillowInput!: ElementRef;

  map!: google.maps.Map;
  marker!: google.maps.Marker;
  propertyForm: FormGroup;
  errorMessage: string = '';
  fileUrl: string = '';
  fileType: string = '';
  isUploading: boolean = false;

  agents: any[] = [];
  filteredAgents: any[] = [];
  apiUrl = `${environment.apiUrl}/agents`;

  searchQuery: string = '';
  selectedEmail: string = '';
  selectedPhone: string = '';
  selectedID: string = '';
  showDropdown: boolean = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private azureBlobService: Azureblobservice,
    private location: Location,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {
    console.log(this.toastr); 

    this.fetchAgents();
    this.propertyForm = this.fb.group({
      title: ['', Validators.required],
      address: ['', Validators.required],
      status: ['', Validators.required],
      price: ['', [Validators.required, Validators.pattern('^[0-9]{1,}$')]],
      propertyType: ['', Validators.required],
      beds: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      bathsfull: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      sqft: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      lotsize2: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      yearbuilt: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      agent_name: ['', Validators.required],
      agent_email: ['', [Validators.required, Validators.email]],
      agent_phone_number: ['', [Validators.required]],
      zillow_link: [''],
      hoa: [''],
      agent_remark: [''],
      description: [''],
      coordinates: [''],
      location_id: [''],
      agent_id: [''],
      profit: ['', [Validators.required, Validators.pattern('^[0-9]{1,}$')]],
      inspection_period_end_date: ['']
    });
  }
  
  ngAfterViewInit() {
    if (typeof google === 'undefined' || !google.maps) {
      console.error('Google Maps API NOT loaded!');
      return;
    }
  
    // Check if the search box element is available
    if (!this.searchBoxElement || !this.searchBoxElement.nativeElement) {
      console.error('Search Box Element is not found!');
      return;
    }
  
    // Initialize the Google Places Autocomplete for the search box element
    const autocomplete = new google.maps.places.Autocomplete(this.searchBoxElement.nativeElement);
  
    // Add an event listener for when a place is selected from the autocomplete suggestions
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
  
      // If no geometry or location is found for the selected place, log an error
      if (!place.geometry || !place.geometry.location) {
        console.error('No geometry found for place');
        return;
      }
  
      // Update the form with the selected address
      this.propertyForm.patchValue({
        address: place.formatted_address,
      });
  
      // You can add any additional code you want to run after the address is selected
      this.onSearch();
    });
  }
  
  navigatetoPreviousPage() {
    this.location.back();
  }

  onSearch() {
    const fullAddress = this.propertyForm.get('address')?.value?.trim();
    if (!fullAddress) {
      this.errorMessage = 'Please enter a valid address';
      return;
    }

    const addressParts = fullAddress.split(',');
    if (addressParts.length < 3) {
      this.errorMessage = 'Invalid address format. Use: Street, City, State';
      return;
    }

    const encodedAddress1 = encodeURIComponent(addressParts[0].trim());
    const encodedAddress2 = encodeURIComponent(`${addressParts[1].trim()}, ${addressParts[2].trim()}`);

    const apiUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=${encodedAddress1}&address2=${encodedAddress2}`;

    const headers = new HttpHeaders({
      apikey: '6d6d123f586e1b63c7b5e05bb2c46cc0',
      Accept: 'application/json',
    });

    this.http.get(apiUrl, { headers }).subscribe(
      (response: any) => {
        if (response?.property?.length > 0) {
          const property = response.property[0];

          const formattedAddress = encodeURIComponent(fullAddress.split(' ').join('-'));
          const zillowLink = `http://www.zillow.com/homes/${formattedAddress}_rb`;

          console.log(zillowLink);
          setTimeout(() => {
            this.zillowInput.nativeElement.value = zillowLink;
          });

          console.log('Generated Zillow Link:', zillowLink);

          this.propertyForm.patchValue({
            bathsfull: property?.building?.rooms?.bathsfull || '',
            beds: property?.building?.rooms?.beds || '',
            yearbuilt: property?.summary?.yearbuilt || '',
            lotsize2: property?.lot?.lotsize2 || '',
            propertyType: property?.summary?.propertyType || '',
            zillow_link: zillowLink
          });

          this.errorMessage = '';
        } else {
          this.errorMessage = 'No property details found for this address.';
        }
      },
      (error) => {
        this.errorMessage = 'Failed to fetch property details. Please try again.';
        console.log(error);
      }
    );
  }

  triggerFileInput() {
    const fileInput: HTMLInputElement | null = document.querySelector('.file-input');
    fileInput?.click();
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
  
    this.isUploading = true;
    try {
      const containerName = 'attachments'; // You can hardcode or pass this dynamically
      const blobName = `${Date.now()}-${file.name}`; // Unique blob name
  
      await this.azureBlobService.createContainerIfNotExists(containerName);
      
      const fullUrl = await this.azureBlobService.uploadFileToAttachments(blobName, file);
      this.fileUrl = fullUrl;
      this.fileType = file.type.split('/')[1] || 'unknown';
  
      this.toastr.success('Image Uploaded Successfully');

    } catch (error) {
      console.error('Error uploading image:', error);
      this.toastr.error('Error uploading image');

    } finally {
      this.isUploading = false;
    }
  }
  

  extractFilePath(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return '';
    }
  }

  submitForm() {
    if (this.propertyForm.invalid) {
      console.error('Form Validation Errors:', this.propertyForm.errors);
      console.log('Profit Value:', this.propertyForm.value.profit);

      Object.keys(this.propertyForm.controls).forEach((key) => {
        const control = this.propertyForm.get(key);
        if (control?.invalid) {
          console.error(`Invalid Field: ${key}, Errors:`, control.errors);
        }
      });
      if (this.propertyForm.invalid) {
        console.error('Form Validation Errors:', this.propertyForm.errors);
        this.toastr.error('Please fill in all required fields');
        return;
      }

      this.toastr.error('Please fill in all required fields');

      return;
    }

    console.log('Form Values:', this.propertyForm.value);

    const requestBody = {
      title: this.propertyForm.value.address || '',
      description: this.propertyForm.value.description || '',
      status: this.propertyForm.value.status || '',
      coordinates: this.propertyForm.value.coordinates || '',
      location_id: this.propertyForm.value.location_id || '',
      price: parseFloat(this.propertyForm.value.price) || 0,
      property_type: this.propertyForm.value.propertyType || '',
      bedrooms: parseInt(this.propertyForm.value.beds) || 0,
      bathrooms: parseInt(this.propertyForm.value.bathsfull) || 0,
      sqft: parseInt(this.propertyForm.value.sqft) || 0,
      lot_size: parseInt(this.propertyForm.value.lotsize2) || 0,
      year_built: parseInt(this.propertyForm.value.yearbuilt) || 0,
      agent_name: this.propertyForm.value.agent_name || '',
      agent_phone_number: this.propertyForm.value.agent_phone_number || '',
      agent_email: this.propertyForm.value.agent_email || '',
      zillow_link: this.propertyForm.value.zillow_link || '',
      hoa: this.propertyForm.value.hoa || '',
      inspection_period_end_date: this.propertyForm.value.inspection_period_end_date || null,
      agent_remark: this.propertyForm.value.agent_remark || '',
      leads: true,
      agent_id: this.propertyForm.value.agent_id || '',
      profit: parseFloat(this.propertyForm.value.profit) || 0,
      attachments: this.fileUrl
        ? [{
          file_url: this.fileUrl,
          file_type: this.fileType,
          uploaded_by: '52404d37-380a-b4bd-3da1-5fab7cd8cf7d'
        }]
        : []
    };

    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    this.http.post(`${environment.apiUrl}/leads`, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    }).subscribe({
      next: (response: any) => {
        this.toastr.success('Lead Created Successfully');
        location.reload();
        console.log(response);
      },
      error: (error) => {
        console.error('API Error:', error);
        this.toastr.error('Error submitting data', error);
      },
    });
  }

  fetchAgents() {
    this.http.get<{ success: boolean; data: any[] }>(this.apiUrl).subscribe({
      next: (response) => {
        console.log('Fetched Response:', response);
        if (response.success && response.data) {
          this.ngZone.run(() => {
            this.agents = response.data;
            this.filteredAgents = [...this.agents];
          });
        } else {
          console.error('Invalid API response structure:', response);
        }
      },
      error: (err) => {
        console.error('Error fetching agents:', err);
      }
    });
  }

  filterAgents() {
    if (!this.searchQuery.trim()) {
      this.filteredAgents = [...this.agents];
      this.showDropdown = false;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredAgents = this.agents.filter(agent =>
      agent?.name?.toLowerCase().includes(query)
    );

    this.showDropdown = this.filteredAgents.length > 0;
  }

  selectAgent(agent: any) {
    this.searchQuery = agent?.name || '';
    this.selectedEmail = agent?.email || 'N/A';
    this.selectedPhone = agent?.phone || 'N/A';
    this.selectedID = agent?.id || 'N/A';
    this.showDropdown = false;

    this.propertyForm.patchValue({
      agent_name: agent?.name || '',
      agent_email: agent?.email || '',
      agent_phone_number: agent?.phone || '',
      agent_id: agent?.id || ''
    });
  }
}
