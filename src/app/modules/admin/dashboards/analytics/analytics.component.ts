/* eslint-disable */
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApexOptions } from 'ng-apexcharts';
import { AnalyticsService } from 'app/modules/admin/dashboards/analytics/analytics.service';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';
import { MatPaginator } from '@angular/material/paginator';

interface MonthlyData {
    label: string;
    total_profit: string;
    profit_count: string;
  }
@Component({
    selector       : 'analytics',
    templateUrl    : './analytics.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsComponent implements OnInit, OnDestroy
{

    sortedData: any[] = [];
    reportinglist: any[] = [];
    recentTransactionsTableColumns: string[] = ['transactionId', 'date', 'profit_count', 'amount', 'status'];
    isExpanded: boolean = false; // Flag to toggle between 6 months and full data

    chartVisitors: ApexOptions;
    chartConversions: ApexOptions;
    chartImpressions: ApexOptions;
    chartVisits: ApexOptions;
    chartVisitorsVsPageViews: ApexOptions;
    chartNewVsReturning: ApexOptions;
    chartGender: ApexOptions;
    chartAge: ApexOptions;
    chartLanguage: ApexOptions;
    data: any;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
 recentTransactionsDataSource: MatTableDataSource<any> = new MatTableDataSource();
    /**
     * Constructor
     */
    constructor(
        private _analyticsService: AnalyticsService,
        private _router: Router,
        private http: HttpClient,
        private ghlIntegrationService: GhlIntegrationService
    )
    {
        this.getallUser();

    }



    // Get ALL USERS WITH NO FILTER OF COMPANY AND LOCATION ID 
//     getallUser(): void {
//     const url = `${environment.apiUrl}/dashboard?profit=true&type=monthly`;

//     this.http.get<any>(url).subscribe((result: any) => {
//         const apiData: MonthlyData[] = result?.data?.result?.monthly || [];

//         const dataByMonth = new Map<number, MonthlyData>();
//         apiData.forEach((item: MonthlyData) => {
//             const monthNumber: number = new Date(item.label).getMonth();
//             dataByMonth.set(monthNumber, item);
//         });

//         const completeData: MonthlyData[] = Array.from({ length: 12 }, (_, monthIndex) => {
//             if (dataByMonth.has(monthIndex)) {
//                 return dataByMonth.get(monthIndex) as MonthlyData;
//             } else {
//                 const dateForMonth = new Date(2025, monthIndex, 1);
//                 return {
//                     label: dateForMonth.toISOString(),
//                     total_profit: "0.00",
//                     profit_count: "0"
//                 };
//             }
//         });

//         this.reportinglist = completeData;
//         this.updateTableData();
//         console.log("Complete Monthly Data:", this.sortedData);
//     }, error => {
//         console.error("Error fetching profit data:", error);
//     });
// }

    

    // Filter with Company and Location ID 
    getallUser(): void {
    const locationId = this.ghlIntegrationService.getLocationId();

    this.ghlIntegrationService.getUserType().subscribe((userType: string | null) => {
        console.log("User Type fetched for profit data:", userType);

        // Determine the API URL based on userType and locationId
        let url = `${environment.apiUrl}/dashboard?profit=true&type=monthly`;

        if (userType !== 'Company'  && locationId) {  
            url += `&location_id=${locationId}`;
            console.log("Fetching monthly profit data for locationId:", locationId);
        } else if (userType === 'Company' || userType === 'admin') {
            console.log("User is a Company, fetching all monthly profit data...");
        } else {
            console.log("No locationId available and userType is not Company. No monthly data to display.");
            this.reportinglist = [];
            this.updateTableData();
            return;
        }

        // Perform the HTTP GET request
        this.http.get<any>(url).subscribe((result: any) => {
            const apiData: MonthlyData[] = result?.data?.result?.monthly || [];

            const dataByMonth = new Map<number, MonthlyData>();
            apiData.forEach((item: MonthlyData) => {
                const monthNumber: number = new Date(item.label).getMonth();
                dataByMonth.set(monthNumber, item);
            });

            const completeData: MonthlyData[] = Array.from({ length: 12 }, (_, monthIndex) => {
                if (dataByMonth.has(monthIndex)) {
                    return dataByMonth.get(monthIndex) as MonthlyData;
                } else {
                    const dateForMonth = new Date(2025, monthIndex, 1);
                    return {
                        label: dateForMonth.toISOString(),
                        total_profit: "0.00",
                        profit_count: "0"
                    };
                }
            });

            this.reportinglist = completeData;
            this.updateTableData();
            console.log("Complete Monthly Data:", this.sortedData);
        }, error => {
            console.error("Error fetching profit data:", error);
        });
    });
}



viewMode: 'monthly' | 'daily' = 'monthly';
selectedMonthIndex: number = -1; // Used in daily view to track which month is selected


    
      // Update the table data based on whether 'isExpanded' is true or not
updateTableData(): void {
    if (this.viewMode === 'monthly') {
        const data = this.isExpanded ? this.reportinglist : this.reportinglist.slice(0, 6);
        this.sortedData = data.map(item => ({
            transactionId: new Date(item.label).toLocaleString('default', { month: 'long' }),
            date: item.label,
            profit_count: item.profit_count,
            amount: parseFloat(item.total_profit),
            status: item.profit_count === "0" ? 'pending' : 'completed'
        }));
        this.recentTransactionsDataSource = new MatTableDataSource(this.sortedData);
        this.recentTransactionsDataSource.paginator = this.paginator;
    } else if (this.selectedMonthIndex >= 0) {
        this.fetchDailyData(this.selectedMonthIndex);
    }
}



fetchDailyData(monthIndex: number): void {
    const year = 2025;
    const selectedMonth = monthIndex;

const startDate = new Date(Date.UTC(year, selectedMonth, 1)).toISOString().split('T')[0];
const endDate = new Date(Date.UTC(year, selectedMonth + 1, 0)).toISOString().split('T')[0];

    const locationId = this.ghlIntegrationService.getLocationId();

    this.ghlIntegrationService.getUserType().subscribe(userType => {
        let url = `${environment.apiUrl}/dashboard?profit=true&type=daily&startDate=${startDate}&endDate=${endDate}`;
        if (userType !== 'Company' && locationId) {
            url += `&location_id=${locationId}`;
        }

        this.http.get<any>(url).subscribe((result: any) => {
            const rawDaily = result?.data?.result?.daily || [];

            // Convert API data into a map by date for fast lookup
            const apiDataMap = new Map<string, MonthlyData>();
            rawDaily.forEach((item: MonthlyData) => {
                const date = new Date(item.label);
                const key = date.toISOString().split('T')[0];
                apiDataMap.set(key, item);
            });

            const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
            const completeDays: MonthlyData[] = [];

            // Fill in all days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(year, selectedMonth, day);
                const dateStr = dateObj.toISOString().split('T')[0];

                const entry = apiDataMap.get(dateStr) || {
                    label: dateStr,
                    total_profit: "0.00",
                    profit_count: "0"
                };

                completeDays.push(entry);
            }

            // Build the table data
          const filteredDays = completeDays.filter((entry) => {
    const date = new Date(entry.label);
    return date.getMonth() === selectedMonth;
});

// Build the table data
this.sortedData = filteredDays.map(day => ({
    transactionId: new Date(day.label).toLocaleDateString(),
    date: day.label,
    profit_count: day.profit_count,
    amount: parseFloat(day.total_profit),
    status: day.profit_count === "0" ? 'pending' : 'completed'
}));

            // Sort by date just to be safe
            this.sortedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Update the table datasource and paginator
this.recentTransactionsDataSource = new MatTableDataSource(this.sortedData);
setTimeout(() => {
    this.recentTransactionsDataSource.paginator = this.paginator;
});

        });
    });
}


displayedColumns: string[] = ['transactionId', 'date', 'profit_count', 'amount', 'status'];



@ViewChild(MatPaginator) paginator: MatPaginator;


onMonthClicked(index: number): void {
    this.viewMode = 'daily';
    this.selectedMonthIndex = index;
    this.updateTableData();
}
onMonthChanged(monthIndex: number): void {
  this.selectedMonthIndex = monthIndex;
  this.fetchDailyData(monthIndex);
}



monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

switchToMonthly(): void {
    this.viewMode = 'monthly';
    this.selectedMonthIndex = -1;
    this.updateTableData();
}

    toggleViewMode(): void {
    if (this.viewMode === 'monthly') {
        // Switch to daily view using current selected index or default to 0
        this.viewMode = 'daily';
        this.selectedMonthIndex = this.selectedMonthIndex >= 0 ? this.selectedMonthIndex : 0;
    } else {
        // Switch back to monthly view
        this.viewMode = 'monthly';
        this.selectedMonthIndex = -1;
    }
    this.updateTableData();
}

      // Toggle the display between 6 months and full data
      toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        this.updateTableData();

      }
    
    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Get the data
        this._analyticsService.data$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data) => {

                // Store the data
                this.data = data;

                // Prepare the chart data
                this._prepareChartData();
            });

        // Attach SVG fill fixer to all ApexCharts
        window['Apex'] = {
            chart: {
                events: {
                    mounted: (chart: any, options?: any): void => {
                        this._fixSvgFill(chart.el);
                    },
                    updated: (chart: any, options?: any): void => {
                        this._fixSvgFill(chart.el);
                    }
                }
            }
        };
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
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Fix the SVG fill references. This fix must be applied to all ApexCharts
     * charts in order to fix 'black color on gradient fills on certain browsers'
     * issue caused by the '<base>' tag.
     *
     * Fix based on https://gist.github.com/Kamshak/c84cdc175209d1a30f711abd6a81d472
     *
     * @param element
     * @private
     */
    private _fixSvgFill(element: Element): void
    {
        // Current URL
        const currentURL = this._router.url;

        // 1. Find all elements with 'fill' attribute within the element
        // 2. Filter out the ones that doesn't have cross reference so we only left with the ones that use the 'url(#id)' syntax
        // 3. Insert the 'currentURL' at the front of the 'fill' attribute value
        Array.from(element.querySelectorAll('*[fill]'))
             .filter(el => el.getAttribute('fill').indexOf('url(') !== -1)
             .forEach((el) => {
                 const attrVal = el.getAttribute('fill');
                 el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))}`);
             });
    }

    /**
     * Prepare the chart data from the data
     *
     * @private
     */
    private _prepareChartData(): void
    {
        // Visitors
        this.chartVisitors = {
            chart     : {
                animations: {
                    speed           : 400,
                    animateGradually: {
                        enabled: false
                    }
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                width     : '100%',
                height    : '100%',
                type      : 'area',
                toolbar   : {
                    show: false
                },
                zoom      : {
                    enabled: false
                }
            },
            colors    : ['#818CF8'],
            dataLabels: {
                enabled: false
            },
            fill      : {
                colors: ['#312E81']
            },
            grid      : {
                show       : true,
                borderColor: '#334155',
                padding    : {
                    top   : 10,
                    bottom: -40,
                    left  : 0,
                    right : 0
                },
                position   : 'back',
                xaxis      : {
                    lines: {
                        show: true
                    }
                }
            },
            series    : this.data.visitors.series,
            stroke    : {
                width: 2
            },
            tooltip   : {
                followCursor: true,
                theme       : 'dark',
                x           : {
                    format: 'MMM dd, yyyy'
                },
                y           : {
                    formatter: (value: number): string => `${value}`
                }
            },
            xaxis     : {
                axisBorder: {
                    show: false
                },
                axisTicks : {
                    show: false
                },
                crosshairs: {
                    stroke: {
                        color    : '#475569',
                        dashArray: 0,
                        width    : 2
                    }
                },
                labels    : {
                    offsetY: -20,
                    style  : {
                        colors: '#CBD5E1'
                    }
                },
                tickAmount: 20,
                tooltip   : {
                    enabled: false
                },
                type      : 'datetime'
            },
            yaxis     : {
                axisTicks : {
                    show: false
                },
                axisBorder: {
                    show: false
                },
                min       : (min): number => min - 750,
                max       : (max): number => max + 250,
                tickAmount: 5,
                show      : false
            }
        };

        // Conversions
        this.chartConversions = {
            chart  : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'area',
                sparkline : {
                    enabled: true
                }
            },
            colors : ['#38BDF8'],
            fill   : {
                colors : ['#38BDF8'],
                opacity: 0.5
            },
            series : this.data.conversions.series,
            stroke : {
                curve: 'smooth'
            },
            tooltip: {
                followCursor: true,
                theme       : 'dark'
            },
            xaxis  : {
                type      : 'category',
                categories: this.data.conversions.labels
            },
            yaxis  : {
                labels: {
                    formatter: (val): string => val.toString()
                }
            }
        };

        // Impressions
        this.chartImpressions = {
            chart  : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'area',
                sparkline : {
                    enabled: true
                }
            },
            colors : ['#34D399'],
            fill   : {
                colors : ['#34D399'],
                opacity: 0.5
            },
            series : this.data.impressions.series,
            stroke : {
                curve: 'smooth'
            },
            tooltip: {
                followCursor: true,
                theme       : 'dark'
            },
            xaxis  : {
                type      : 'category',
                categories: this.data.impressions.labels
            },
            yaxis  : {
                labels: {
                    formatter: (val): string => val.toString()
                }
            }
        };

        // Visits
        this.chartVisits = {
            chart  : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'area',
                sparkline : {
                    enabled: true
                }
            },
            colors : ['#FB7185'],
            fill   : {
                colors : ['#FB7185'],
                opacity: 0.5
            },
            series : this.data.visits.series,
            stroke : {
                curve: 'smooth'
            },
            tooltip: {
                followCursor: true,
                theme       : 'dark'
            },
            xaxis  : {
                type      : 'category',
                categories: this.data.visits.labels
            },
            yaxis  : {
                labels: {
                    formatter: (val): string => val.toString()
                }
            }
        };

        // Visitors vs Page Views
        this.chartVisitorsVsPageViews = {
            chart     : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'area',
                toolbar   : {
                    show: false
                },
                zoom      : {
                    enabled: false
                }
            },
            colors    : ['#64748B', '#94A3B8'],
            dataLabels: {
                enabled: false
            },
            fill      : {
                colors : ['#64748B', '#94A3B8'],
                opacity: 0.5
            },
            grid      : {
                show   : false,
                padding: {
                    bottom: -40,
                    left  : 0,
                    right : 0
                }
            },
            legend    : {
                show: false
            },
            series    : this.data.visitorsVsPageViews.series,
            stroke    : {
                curve: 'smooth',
                width: 2
            },
            tooltip   : {
                followCursor: true,
                theme       : 'dark',
                x           : {
                    format: 'MMM dd, yyyy'
                }
            },
            xaxis     : {
                axisBorder: {
                    show: false
                },
                labels    : {
                    offsetY: -20,
                    rotate : 0,
                    style  : {
                        colors: 'var(--fuse-text-secondary)'
                    }
                },
                tickAmount: 3,
                tooltip   : {
                    enabled: false
                },
                type      : 'datetime'
            },
            yaxis     : {
                labels    : {
                    style: {
                        colors: 'var(--fuse-text-secondary)'
                    }
                },
                max       : (max): number => max + 250,
                min       : (min): number => min - 250,
                show      : false,
                tickAmount: 5
            }
        };

        // New vs. returning
        this.chartNewVsReturning = {
            chart      : {
                animations: {
                    speed           : 400,
                    animateGradually: {
                        enabled: false
                    }
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'donut',
                sparkline : {
                    enabled: true
                }
            },
            colors     : ['#e10611', '#e0e0e0'],
            labels     : this.data.newVsReturning.labels,
            plotOptions: {
                pie: {
                    customScale  : 0.9,
                    expandOnClick: false,
                    donut        : {
                        size: '55%'
                    }
                }
            },
            series     : this.data.newVsReturning.series,
            states     : {
                hover : {
                    filter: {
                        type: 'none'
                    }
                },
                active: {
                    filter: {
                        type: 'none'
                    }
                }
            },
            tooltip    : {
                enabled        : true,
                fillSeriesColor: false,
                theme          : 'dark',
                custom         : ({
                                      seriesIndex,
                                      w
                                  }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                    <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                    <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                    <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                </div>`
            }
        };

        // Gender
        this.chartGender = {
            chart      : {
                animations: {
                    speed           : 400,
                    animateGradually: {
                        enabled: false
                    }
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'donut',
                sparkline : {
                    enabled: true
                }
            },
            colors     : ['#28a745', '#e0e0e0'],
            labels     : this.data.gender.labels,
            plotOptions: {
                pie: {
                    customScale  : 0.9,
                    expandOnClick: false,
                    donut        : {
                        size: '55%'
                    }
                }
            },
            series     : this.data.gender.series,
            states     : {
                hover : {
                    filter: {
                        type: 'none'
                    }
                },
                active: {
                    filter: {
                        type: 'none'
                    }
                }
            },
            tooltip    : {
                enabled        : true,
                fillSeriesColor: false,
                theme          : 'dark',
                custom         : ({
                                      seriesIndex,
                                      w
                                  }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                     <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                     <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                     <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                 </div>`
            }
        };

        // Age
        this.chartAge = {
            chart      : {
                animations: {
                    speed           : 400,
                    animateGradually: {
                        enabled: false
                    }
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'donut',
                sparkline : {
                    enabled: true
                }
            },
            colors     : ['#ffc107', '#e0e0e0'],
            labels     : this.data.age.labels,
            plotOptions: {
                pie: {
                    customScale  : 0.9,
                    expandOnClick: false,
                    donut        : {
                        size: '55%'
                    }
                }
            },
            series     : this.data.age.series,
            states     : {
                hover : {
                    filter: {
                        type: 'none'
                    }
                },
                active: {
                    filter: {
                        type: 'none'
                    }
                }
            },
            tooltip    : {
                enabled        : true,
                fillSeriesColor: false,
                theme          : 'dark',
                custom         : ({
                                      seriesIndex,
                                      w
                                  }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                    <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                    <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                    <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                </div>`
            }
        };

        // Language
        this.chartLanguage = {
            chart      : {
                animations: {
                    speed           : 400,
                    animateGradually: {
                        enabled: false
                    }  
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'donut',
                sparkline : {
                    enabled: true
                }
            },
            colors     : ['#ffc107', '#e0e0e0'],
            labels     : this.data.language.labels,
            plotOptions: {  
                pie: {
                    customScale  : 0.9,
                    expandOnClick: false,
                    donut        : {
                        size: '55%'
                    }
                }
            },
            series     : this.data.language.series,
            states     : {
                hover : {
                    filter: {
                        type: 'none'
                    }
                },
                active: {
                    filter: {
                        type: 'none'
                    }
                }
            },
            tooltip    : {
                enabled        : true,
                fillSeriesColor: false,
                theme          : 'dark',
                custom         : ({
                                      seriesIndex,
                                      w
                                  }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                    <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                    <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                    <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                </div>`
            }
        };
    }
    ngAfterViewInit(): void {
    this.recentTransactionsDataSource.paginator = this.paginator;
}
}
