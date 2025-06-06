import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'environments/environment';

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
export class ActivitiesComponent implements OnInit {
    announcements: Announcement[] = [];
    private readonly apiUrl = `${environment.apiUrl}/announcements`;

    createMode = false;
    editId: string | null = null;

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

    constructor(private http: HttpClient, private toastr: ToastrService) {}

    ngOnInit(): void {
        this.getAnnouncements();
    }

    getAnnouncements(): void {
        this.http.get<{ success: boolean; data: Announcement[] }>(`${this.apiUrl}?list=true`)
            .subscribe(response => {
                this.announcements = response.data;
            });
    }

    createAnnouncement(): void {
        this.newAnnouncement.created_at = new Date().toISOString();
        this.http.post<Announcement>(this.apiUrl, this.newAnnouncement)
            .subscribe(() => {
                this.getAnnouncements();
                this.createMode = false;
                this.toastr.success("New Annoucement Created Successfully")
                this.resetNewAnnouncement();
            });
    }

updateAnnouncement(id: string): void {
    const payload = {
        id: id,
        ...this.editAnnouncement
    };

    this.http.put(`${this.apiUrl}`, payload)
        .subscribe(() => {
            this.getAnnouncements();
            this.toastr.success("Edited Announcement Successfully");
            this.editId = null;
        });
}

    deleteAnnouncement(id: string): void {
    const options = {
        body: { id }
    };
  
    this.http.delete(`${this.apiUrl}`, options)
        .subscribe(() => this.getAnnouncements());
        this.toastr.success("Announcement Delected Successfully")
}

    isSameDay(current: string, compare: string): boolean {
        return moment(current, moment.ISO_8601).isSame(moment(compare, moment.ISO_8601), 'day');
    }

    getRelativeFormat(date: string): string {
        const today = moment().startOf('day');
        const yesterday = moment().subtract(1, 'day').startOf('day');

        if (moment(date, moment.ISO_8601).isSame(today, 'day')) {
            return 'Today';
        }
        if (moment(date, moment.ISO_8601).isSame(yesterday, 'day')) {
            return 'Yesterday';
        }

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
            location_id: 'default',
            totalrequests: '0',
            created_at: new Date().toISOString()
        };
    }
}
