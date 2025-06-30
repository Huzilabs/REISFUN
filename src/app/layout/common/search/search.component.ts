import { Component, ElementRef, EventEmitter, HostBinding, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, filter, map, takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations/public-api';
import algoliasearch from 'algoliasearch';
import { Router } from '@angular/router';
@Component({
    selector     : 'search',
    templateUrl  : './search.component.html',
    encapsulation: ViewEncapsulation.None,
    exportAs     : 'fuseSearch',
    animations   : fuseAnimations
})
export class SearchComponent implements OnChanges, OnInit, OnDestroy
{
    @Input() appearance: 'basic' | 'bar' = 'basic';
    @Input() debounce: number = 300;
    @Input() minLength: number = 2;
    @Output() search: EventEmitter<any> = new EventEmitter<any>();
leadsResults: any[] = [];
mlsResults: any[] = [];
    opened: boolean = false;
    resultSets: any[];
    searchControl: FormControl = new FormControl();
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private algoliaClient = algoliasearch('VOY1Y6ZTXU', '5e4eb606608dc522245eb397022496e8');
    private algoliaIndex = this.algoliaClient.initIndex('leads_202506251429');

    /**
     * Constructor
     */
    constructor(
        private _elementRef: ElementRef,
        private _httpClient: HttpClient,
        private _renderer2: Renderer2,
            private router: Router // Add Router

    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Host binding for component classes
     */
    @HostBinding('class') get classList(): any
    {
        return {
            'search-appearance-bar'  : this.appearance === 'bar',
            'search-appearance-basic': this.appearance === 'basic',
            'search-opened'          : this.opened
        };
    }
onResultClick(item: any): void {
    if (!item || !item.objectID || !item.sourceIndex) return;

    let url = '';
    if (item.sourceIndex === 'leads') {
        url = `/dashboards/propertydetails/${item.objectID}`;
    } else if (item.sourceIndex === 'mls') {
        url = `/dashboards/mlsdetails/${item.objectID}`;
    }

    if (url) {
        this.router.navigateByUrl(url);
    }

    this.close();
}
getDisplayUrl(result: any): string {
    if (result.link || result.url) {
        return result.link || result.url;
    }

    if (result.sourceIndex === 'leads') {
        return `/dashboards/propertydetails/${result.objectID}`;
    } else if (result.sourceIndex === 'mls') {
        return `/dashboards/mlsdetails/${result.objectID}`;
    }

    return '';
}


    /**
     * Setter for bar search input
     *
     * @param value
     */
    @ViewChild('barSearchInput')
    set barSearchInput(value: ElementRef)
    {
        // If the value exists, it means that the search input
        // is now in the DOM and we can focus on the input..
        if ( value )
        {
            // Give Angular time to complete the change detection cycle
            setTimeout(() => {

                // Focus to the input element
                value.nativeElement.focus();
            });
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void
    {
        // Appearance
        if ( 'appearance' in changes )
        {
            // To prevent any issues, close the
            // search after changing the appearance
            this.close();
        }
    }

    /**
     * On init
     */
 ngOnInit(): void
{
    this.searchControl.valueChanges
        .pipe(
            debounceTime(this.debounce),
            takeUntil(this._unsubscribeAll),
            map((value) => {
                if (!value || value.length < this.minLength) {
                    this.leadsResults = [];
                    this.mlsResults = [];
                }
                return value;
            }),
            filter(value => value && value.length >= this.minLength)
        )
        .subscribe((value) => {
            Promise.all([
                this.algoliaIndex.search(value),
                this.algoliaClient.initIndex('mls_leads').search(value)
            ]).then(([leadsResult, mlsResult]) => {
                this.leadsResults = leadsResult.hits.map(hit => ({ ...hit, sourceIndex: 'leads' }));
                this.mlsResults = mlsResult.hits.map(hit => ({ ...hit, sourceIndex: 'mls' }));
                this.search.next([...this.leadsResults, ...this.mlsResults]);
            });
        });
}

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * On keydown of the search input
     *
     * @param event
     */
    onKeydown(event: KeyboardEvent): void
    {
        // Listen for escape to close the search
        // if the appearance is 'bar'
        if ( this.appearance === 'bar' )
        {
            // Escape
            if ( event.code === 'Escape' )
            {
                // Close the search
                this.close();
            }
        }
    }

    /**
     * Open the search
     * Used in 'bar'
     */
    open(): void
    {
        // Return if it's already opened
        if ( this.opened )
        {
            return;
        }

        // Open the search
        this.opened = true;
    }

    /**
     * Close the search
     * * Used in 'bar'
     */
    close(): void
    {
        // Return if it's already closed
        if ( !this.opened )
        {
            return;
        }

        // Clear the search input
        this.searchControl.setValue('');

        // Close the search
        this.opened = false;
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }
}
