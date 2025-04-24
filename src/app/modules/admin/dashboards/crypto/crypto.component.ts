import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
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

declare var google: any;  // Declare google object for TypeScript to recognize it


@Component({
    selector       : 'crypto',
    templateUrl    : './crypto.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CryptoComponent implements OnInit, OnDestroy {
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

    constructor(
        private _cryptoService: CryptoService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private route: ActivatedRoute,
        private http: HttpClient,
        private fb: FormBuilder,
        private router: Router,
        private toastr: ToastrService,

    ) {

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
        console.error("No property ID found.");
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

location.reload()
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



}
