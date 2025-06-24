import { fuseAnimations } from '@fuse/animations';



import {
  Component,
  ViewEncapsulation,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import { Azureblobservice } from 'app/shared/azureblobservice.service';
import { environment } from 'environments/environment';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';


@Component({
    selector     : 'colors',
    templateUrl  : './colors.component.html',
    animations   : fuseAnimations,
    encapsulation: ViewEncapsulation.None
})
export class ColorsComponent implements AfterViewInit {
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
  searchQuery: string = '';
  selectedEmail: string = '';
  selectedPhone: string = '';
  selectedID: string = '';
  showDropdown: boolean = false;
  apiUrl = `${environment.apiUrl}/agents`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private azureBlobService: Azureblobservice,
    private location: Location,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private ghlIntegrationService: GhlIntegrationService
  ) {
    this.ghlIntegrationService.initialize();

    this.propertyForm = this.fb.group({
      title: ['', Validators.required],
      address: [''],
      agent_name: [''],
      zillow_link: [''],
      agent_id: [''],
      created_by:['me'],
      priority:[''],
      agent_phone_mobile:[''],
      agent_phone_work:[''],
      agent_email_work:[''],
      agent_email_home:[''],
      agent_email_other:[''],
      asking_price:[''],
      deal_status:[''],
      property_condition_notes:[''],
      which_contract:[''],
      arv:[''],
      rehab_calculator:[],
      cash_offer:[''],
      emd:[''],
      contract_info:[''],
      did_agent_answer_call:[''],
      are_we_far_off:[''],
      special_offer_notes:[''],
      offer_results:[''],
      offer:[''],
      tags:['']

    });

    this.propertyForm.get('address')?.valueChanges.subscribe(address => {
      if (address) {
        this.propertyForm.get('title')?.setValue(address, { emitEvent: false });
        this.generateZillowLink(address);
      }
    });

    this.fetchAgents();  
  }

  ngAfterViewInit() {
    if (typeof google === 'undefined' || !google.maps) {
      console.error('Google Maps API NOT loaded!');
      return;
    }
  
    // Initialize the Google Places Autocomplete for the search box element
    const autocomplete = new google.maps.places.Autocomplete(this.searchBoxElement.nativeElement);
  
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
  
      // Ensure there is geometry data
      if (!place.geometry || !place.geometry.location) {
        console.error('No geometry found for place');
        return;
      }
  
      // Capture the full formatted address
      const fullAddress = place.formatted_address || '';
  
      // Set the full address as the title and address
      this.propertyForm.patchValue({
        address: fullAddress,  // Set the full address in the address field
        title: fullAddress     // Ensure title matches the address
      });
  
      // Optional: Generate Zillow link using the full address
      this.generateZillowLink(fullAddress);
    });
  }
  

  private initializeAutocomplete(): void {
    if (
      typeof google === 'undefined' ||
      !google.maps ||
      !this.searchBoxElement ||
      !this.searchBoxElement.nativeElement
    ) {
      console.error('Google Maps API or search box element not available.');
      return;
    }
  
    const nativeInput = this.searchBoxElement.nativeElement as HTMLInputElement;
  
    // Prevent 'Enter' key from triggering unwanted form submissions
    nativeInput.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
    });
  
    const autocomplete = new google.maps.places.Autocomplete(nativeInput);
  
    autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = autocomplete.getPlace();
  
        if (!place.geometry || !place.geometry.location) {
          console.error('No geometry found for selected place');
          return;
        }
  
        const formattedAddress = place.formatted_address || '';
        this.propertyForm.patchValue({ address: formattedAddress });
  
        this.onSearch();
      });
    });
  }
  

  generateZillowLink(address: string): void {
    if (!address) return;
    const formattedAddress = encodeURIComponent(address.split(' ').join('-'));
    const zillowLink = `http://www.zillow.com/homes/${formattedAddress}_rb`;
    this.propertyForm.patchValue({ zillow_link: zillowLink });
    setTimeout(() => {
      if (this.zillowInput?.nativeElement) {
        this.zillowInput.nativeElement.value = zillowLink;
      }
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

          this.propertyForm.patchValue({
            bathsfull: property?.building?.rooms?.bathsfull || '',
            beds: property?.building?.rooms?.beds || '',
            yearbuilt: property?.summary?.yearbuilt || '',
            lotsize2: property?.lot?.lotsize2 || '',
            propertyType: property?.summary?.propertyType || '',
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

 // Add an array to store multiple uploaded file URLs and types
uploadedFiles: { fileUrl: string; fileType: string }[] = [];

async onFileSelected(event: any) {
  const files: FileList = event.target.files;
  if (!files || files.length === 0) return;

  this.isUploading = true;
  try {
    const containerName = 'attachments';
    await this.azureBlobService.createContainerIfNotExists(containerName);

    const filesArray = Array.from(files);

    // Upload new files
    const uploadedUrls = await this.azureBlobService.uploadFilesToAttachments(filesArray);

    // Append new uploaded files to the existing list
    uploadedUrls.forEach((url, idx) => {
      this.uploadedFiles.push({
        fileUrl: url,
        fileType: filesArray[idx].type.split('/')[1] || 'unknown'
      });
    });

    this.toastr.success('Files uploaded successfully');
  } catch (error) {
    console.error('Error uploading files:', error);
    this.toastr.error('Error uploading files');
  } finally {
    this.isUploading = false;
    // Clear the file input to allow re-selection of same files if needed
    event.target.value = null;
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

submitForm(event?: Event): void {
  if (event) {
    event.preventDefault();
  }

  if (this.propertyForm.invalid) {
    this.toastr.error('Please fill in all required fields');
    return;
  }

  const formValue = this.propertyForm.value;

  // Map form controls to request body matching your new form group
  const requestBody = {  
    id: '',  // usually empty or handled by backend
    address: formValue.address,
    agent_name: formValue.agent_name,
    agent_email: formValue.agent_email,
    agent_phone_number: formValue.agent_phone_number,
    zillow_link: formValue.zillow_link,
    agent_id: formValue.agent_id,
    created_by: formValue.created_by,
    priority: formValue.priority,
    agent_phone_mobile: formValue.agent_phone_mobile,
    agent_phone_work: formValue.agent_phone_work,
    agent_email_work: formValue.agent_email_work,
    agent_email_home: formValue.agent_email_home,
    agent_email_other: formValue.agent_email_other,
    asking_price: formValue.asking_price,
    deal_status: formValue.deal_status,
    property_condition_notes: formValue.property_condition_notes,
    which_contract: formValue.which_contract,
    arv: formValue.arv,
    rehab_calculator: formValue.rehab_calculator,
    cash_offer: formValue.cash_offer,
    emd: formValue.emd,
    contract_info: formValue.contract_info,
    did_agent_answer_call: formValue.did_agent_answer_call,
    are_we_far_off: formValue.are_we_far_off,
    special_offer_notes: formValue.special_offer_notes,
    offer_results: formValue.offer_results,
    offer: formValue.offer,
    tags: formValue.tags,
    // Attachments as before
    attachments: this.uploadedFiles.length > 0 ? this.uploadedFiles.map(file => ({
      file_url: file.fileUrl,
      file_type: file.fileType,
      uploaded_by: '52404d37-380a-b4bd-3da1-5fab7cd8cf7d'  // ideally dynamic user id
    })) : []
  };

  console.log('Final request body:', JSON.stringify(requestBody, null, 2));

  this.http.post(`${environment.apiUrl}mls_leads`, requestBody).subscribe({
    next: () => {
      this.toastr.success('Lead Created Successfully');
      location.reload();
    },
    error: (error) => {
      console.error('API Error:', error);
      this.toastr.error('Error submitting data');
    }
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
isImage(fileType: string): boolean {
  return ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp'].includes(fileType.toLowerCase());
}

extractFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
  } catch {
    return url;
  }
}
removeFile(index: number): void {
  if (index >= 0 && index < this.uploadedFiles.length) {
    this.uploadedFiles.splice(index, 1);
  }
}
  
}
