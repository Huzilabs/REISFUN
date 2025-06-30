/* eslint-disable */
import { Component, OnInit, OnDestroy } from '@angular/core';
import * as moment from 'moment';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'environments/environment';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Announcement {
    id: string;
    title: string;
    description: string;
    created_at: string;
    is_active: boolean;
    is_featured: boolean;
    location_id: string;
    totalrequests: string;
}

@Component({
    selector: 'activity',
    templateUrl: './activities.component.html'
})
export class ActivitiesComponent implements OnInit, OnDestroy {
    announcements: Announcement[] = [];
    allAnnouncements: Announcement[] = [];
    private readonly apiUrl = `${environment.apiUrl}/announcements`;
    private destroy$ = new Subject<void>();

    createMode = false;
    editId: string | null = null;
    showConfirmDialog = false;
    deleteCandidateId: string | null = null;

    userType: string | null = null;
    userLocationId: string | null = null;
    isCompanyOrAdmin = false;

    newAnnouncement: Partial<Announcement> = {
        title: '',
        description: '',
        is_active: true,
        is_featured: false,
        location_id: 'default',
        totalrequests: '0',
        created_at: new Date().toISOString()
    };

    editAnnouncement: Partial<Announcement> = {};

    constructor(
        private http: HttpClient,
        private toastr: ToastrService,
        private ghlIntegrationService: GhlIntegrationService
    ) {}

    ngOnInit(): void {
        this.ghlIntegrationService.initialize();

        combineLatest([
            this.ghlIntegrationService.getUserType(),
            this.ghlIntegrationService.getUserDetails()
        ]).pipe(takeUntil(this.destroy$))
        .subscribe(([userType, userDetails]) => {
            this.userType = userType;
            this.userLocationId = userDetails?.location_id || this.ghlIntegrationService.getLocationId();

            this.isCompanyOrAdmin = userType === 'Company' ||
                (userDetails?.role === 'admin') ||
                (userType && userType.toLowerCase().includes('admin'));

            if (!this.isCompanyOrAdmin && this.userLocationId) {
                this.newAnnouncement.location_id = this.userLocationId;
            }

            this.getAnnouncements();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getAnnouncements(): void {
        this.http.get<{ success: boolean; data: Announcement[] }>(`${this.apiUrl}?list=true`)
            .subscribe(response => {
                this.allAnnouncements = response.data || [];
                this.filterAnnouncements();
            }, error => {
                console.error('Error fetching announcements:', error);
                this.announcements = [];
                this.allAnnouncements = [];
            });
    }

   private filterAnnouncements(): void {
    this.announcements = this.allAnnouncements;
}

    createAnnouncement(): void {
        if (!this.isCompanyOrAdmin && this.userLocationId) {
            this.newAnnouncement.location_id = this.userLocationId;
        }
        this.newAnnouncement.created_at = new Date().toISOString();

        this.http.post<Announcement>(this.apiUrl, this.newAnnouncement)
            .subscribe(() => {
                this.getAnnouncements();
                this.createMode = false;
                this.toastr.success("New Announcement Created Successfully");
                this.resetNewAnnouncement();
            }, error => {
                console.error('Error creating announcement:', error);
                this.toastr.error("Failed to create announcement");
            });
    }

    updateAnnouncement(id: string): void {
        const payload = { id, ...this.editAnnouncement };

        this.http.put(`${this.apiUrl}`, payload)
            .subscribe(() => {
                this.getAnnouncements();
                this.toastr.success("Edited Announcement Successfully");
                this.editId = null;
            }, error => {
                console.error('Error updating announcement:', error);
                this.toastr.error("Failed to update announcement");
            });
    }

    confirmDeleteAnnouncement(id: string): void {
        this.showConfirmDialog = true;
        this.deleteCandidateId = id;
    }

    cancelDelete(): void {
        this.showConfirmDialog = false;
        this.deleteCandidateId = null;
    }

    proceedDelete(): void {
        if (!this.deleteCandidateId) return;

        const options = { body: { id: this.deleteCandidateId } };
        this.http.delete(`${this.apiUrl}`, options)
            .subscribe(() => {
                this.getAnnouncements();
                this.toastr.success("Announcement Deleted Successfully");
                this.showConfirmDialog = false;
                this.deleteCandidateId = null;
            }, error => {
                console.error('Error deleting announcement:', error);
                this.toastr.error("Failed to delete announcement");
                this.showConfirmDialog = false;
            });
    }

    isSameDay(current: string, compare: string): boolean {
        return moment(current, moment.ISO_8601).isSame(moment(compare, moment.ISO_8601), 'day');
    }

    getRelativeFormat(date: string): string {
        const today = moment().startOf('day');
        const yesterday = moment().subtract(1, 'day').startOf('day');

        if (moment(date, moment.ISO_8601).isSame(today, 'day')) return 'Today';
        if (moment(date, moment.ISO_8601).isSame(yesterday, 'day')) return 'Yesterday';

        return moment(date, moment.ISO_8601).fromNow();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private resetNewAnnouncement(): void {
        this.newAnnouncement = {
            title: '',
            description: '',
            is_active: true,
            is_featured: false,
            location_id: !this.isCompanyOrAdmin && this.userLocationId ? this.userLocationId : 'default',
            totalrequests: '0',
            created_at: new Date().toISOString()
        };
    }

    canCreateAnnouncement(): boolean {
        return this.userType !== null;
    }

    getUserInfo(): string {
        return `Type: ${this.userType}, Location: ${this.userLocationId}, IsCompanyAdmin: ${this.isCompanyOrAdmin}`;
    }
}
