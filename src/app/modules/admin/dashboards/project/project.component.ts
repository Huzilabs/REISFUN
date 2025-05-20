import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewEncapsulation, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApexOptions } from 'ng-apexcharts';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FinanceService } from 'app/modules/admin/dashboards/finance/finance.service';
import { HttpClient } from '@angular/common/http';

import { environment } from 'environments/environment';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';

@Component({
    selector       : 'project',
    templateUrl    : './project.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectComponent implements OnInit, OnDestroy
{
    chartGithubIssues: ApexOptions = {};
    chartTaskDistribution: ApexOptions = {};
    chartBudgetDistribution: ApexOptions = {};
    chartWeeklyExpenses: ApexOptions = {};
    chartMonthlyExpenses: ApexOptions = {};
    chartYearlyExpenses: ApexOptions = {};
    data:any;
    Tabledata: any;
    selectedProject: string = 'ACME Corp. Backend App';
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    @ViewChild('recentTransactionsTable', {read: MatSort}) recentTransactionsTableMatSort: MatSort;
    recentTransactionsDataSource: MatTableDataSource<any> = new MatTableDataSource();
    recentTransactionsTableColumns: string[] = ['transactionId', 'date', 'name', 'amount', 'status'];
    chartDealsStatus: ApexOptions = {};  // New chart for deals status
    dealsStatusData = {
        closed: 0,
        cancelled: 0,
        assigned: 0,
        active:0,
    };
    isDealsDataLoading = true;
    
    constructor(
        private _projectService: ProjectService,
        private _router: Router,
        private _financeService: FinanceService,
        private http:HttpClient,
        private cdr: ChangeDetectorRef,
        private ghlIntegrationService: GhlIntegrationService
    ) { 
        this.getallannoucements();
        this.fetchDealsStatusData();
        this.leadersData();
        this.ghlIntegrationService.initialize();

    }
    postannouncements() {
        console.log('Starting announcement post process');
    
        // Get userType from the service
        this.ghlIntegrationService.getUserType().subscribe(
          (userType: string | null) => {
            if (userType === 'Company') {
              this.http.post(`${environment.apiUrl}/announcements`, this.newAccoucment).subscribe(
                (res: any) => {
                  console.log('Posted successfully', res);
                  this.getallannoucements();
                  this.showform = false;
                  this.newAccoucment = { title: '', description: '', location_id: '', is_active: true, is_featured: true };
                },
                (err) => {
                  console.log("Error posting announcement", err);
                }  
              );
            } else {
              console.log('Only users with Company role can post announcements');
            }
          },
          (error) => {
            console.error('Error getting user type:', error);
          }
        );
      }  

    fetchDealsStatusData(): void {
        this.isDealsDataLoading = true;
        this.http.get(`${environment.apiUrl}/dashboard?status_count=true`).subscribe(
            (response: any) => {
                if (response.success && response.data) {
                    this.processStatusCounts(response.data);
                    this.initializeDealsStatusChart();
                }
                this.isDealsDataLoading = false;
                this.cdr.markForCheck();
            },
            (error) => {
                console.error('Error fetching deals status counts:', error);
                this.isDealsDataLoading = false;
                this.cdr.markForCheck();
            }
        );
    }

    processStatusCounts(statusCounts: any[]): void {
        statusCounts.forEach(item => {
            const status = item.status.toLowerCase();
            if (status === 'closed') {
                this.dealsStatusData.closed = parseInt(item.count, 10);
            } else if (status === 'canceled' || status === 'cancelled') {
                this.dealsStatusData.cancelled = parseInt(item.count, 10);
            } else if (status === 'active') {
                this.dealsStatusData.active = parseInt(item.count, 10);
            }
            else if (status === 'assigned') {
                this.dealsStatusData.assigned = parseInt(item.count, 10);
            }
        });
    }

    initializeDealsStatusChart(): void {
        const labels = ['Closed', 'Cancelled', 'Active', 'Assigned'];
        const series = [
            this.dealsStatusData.closed,
            this.dealsStatusData.cancelled,
            this.dealsStatusData.active,
            this.dealsStatusData.assigned,
        ];

        this.chartDealsStatus = {
            chart: {
                fontFamily: 'inherit',
                foreColor: 'inherit',
                height: '100%',
                type: 'donut',
                toolbar: {  
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            colors: ['#28a745', '#e10611', '#ffc107','#14B8A6'],
            labels: labels,
            legend: {
                position: 'bottom',
                horizontalAlign: 'center'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '50%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total Deals',
                                formatter: function(w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toString();
                                }
                            }
                        }
                    }
                }
            },
            series: series,
            states: {
                hover: {
                    filter: {
                        type: 'darken',
                        value: 0.75
                    }
                }
            },
            stroke: {
                width: 2
            },
            tooltip: {
                followCursor: true,
                theme: 'dark'
            }
        };
    }

    getleadersData: any = [];
    leadersDataSource = new MatTableDataSource<any>();
    leadersTableColumns: string[] = ['image', 'name', 'closed_count', 'total_profit'];

    leadersData() {
        this.http.get(`${environment.apiUrl}/dashboard?leaderboard=true`).subscribe((result: any) => {
            if (result && result.data && Array.isArray(result.data)) {
                this.getleadersData = result.data;
                this.leadersDataSource.data = this.getleadersData;
                console.log('Fetched Leaders Data:', result);
            } else {
                console.error('Invalid data format received:', result);
            }
        }, error => {
            console.error('Error fetching leaderboard data:', error);
        });
    }

    annoucementlist:any = {};
    showform = false;
    newAccoucment = {
        "title": "",
        "description": "",
        "is_active": false,
        "is_featured": true,
        "location_id": ""
    }

getallannoucements() {
    // Get the locationId from the GhlIntegrationService
    const locationId = this.ghlIntegrationService.getLocationId();

    // Get the userType from the GhlIntegrationService
    this.ghlIntegrationService.getUserType().subscribe((userType: string | null) => {
        console.log("User Type fetched:", userType);  

        // If userType is 'Company', fetch all announcements without location filter
        if (userType === 'Company') {
            console.log("User is a Company, fetching all announcements...");
            this.http.get(`${environment.apiUrl}/announcements?list=true`).subscribe(
                (result: any) => {
                    console.log("Announcement Data for Company:", result);
                    this.annoucementlist = result;
                    this.cdr.detectChanges();
                },
                (err) => {
                    console.log("Error fetching announcements:", err);
                }
            );
        } else if (locationId) {
            // If locationId is available, fetch announcements for the specific locationId
            console.log("Location ID fetched:", locationId);
            this.http.get(`${environment.apiUrl}/announcements?list=true&location_id=${locationId}`).subscribe(
                (result: any) => {
                    console.log("Announcement Data for locationId:", result);
                    this.annoucementlist = result;
                    this.cdr.detectChanges();
                },
                (err) => {
                    console.log("Error fetching announcements:", err);
                }
            );
        } else {
            // If neither userType is 'Company' nor locationId is available, show nothing
            this.annoucementlist = {};  // Clear announcement data
            console.log("No locationId available and userType is not Company. No announcements to display.");
        }
    });
}


    
  
    ngAfterViewInit(): void {
        this.recentTransactionsDataSource.sort = this.recentTransactionsTableMatSort;
    }
    userType: string | null = null;

    ngOnInit(): void {
        this.ghlIntegrationService.getUserType().subscribe(
            (userType: string | null) => {
                this.userType = userType; // Store the user type in a variable
                console.log('User Type in ngOnInit:', this.userType); // Check the value
            },
            (error) => {
                console.error('Error fetching user type:', error);
            }
        );
    

        this._projectService.data$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((data) => {
                this.data = data;
                this._prepareChartData();
                this.recentTransactionsDataSource.data = data.recentTransactions;
            });

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

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    private _fixSvgFill(element: Element): void {
        const currentURL = this._router.url;
        Array.from(element.querySelectorAll('*[fill]'))
             .filter(el => el.getAttribute('fill').indexOf('url(') !== -1)
             .forEach((el) => {
                 const attrVal = el.getAttribute('fill');
                 el.setAttribute('fill', `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))}`);
             });
    }

    private _prepareChartData(): void {
        // Chart data preparation logic here

        // Github issues
        this.chartGithubIssues = {
            chart      : {
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'line',
                toolbar   : {
                    show: false
                },
                zoom      : {
                    enabled: false
                }
            },
            colors     : ['#64748B', '#94A3B8'],
            dataLabels : {
                enabled        : true,
                enabledOnSeries: [0],
                background     : {
                    borderWidth: 0
                }
            },
            grid       : {
                borderColor: 'var(--fuse-border)'
            },
            labels     : this.data.githubIssues.labels,
            legend     : {
                show: false
            },
            plotOptions: {
                bar: {
                    columnWidth: '50%'
                }
            },
            series     : this.data.githubIssues.series,
            states     : {
                hover: {
                    filter: {
                        type : 'darken',
                        value: 0.75
                    }
                }
            },
            stroke     : {
                width: [3, 0]
            },
            tooltip    : {
                followCursor: true,
                theme       : 'dark'
            },
            xaxis      : {
                axisBorder: {
                    show: false
                },
                axisTicks : {
                    color: 'var(--fuse-border)'
                },
                labels    : {
                    style: {
                        colors: 'var(--fuse-text-secondary)'
                    }
                },
                tooltip   : {
                    enabled: false
                }
            },
            yaxis      : {
                labels: {
                    offsetX: -16,
                    style  : {
                        colors: 'var(--fuse-text-secondary)'
                    }
                }
            }
        };
        // Task distribution
        this.chartTaskDistribution = {
            chart      : {
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'polarArea',
                toolbar   : {
                    show: false
                },
                zoom      : {
                    enabled: false
                }
            },
            labels     : this.data.taskDistribution.labels,
            legend     : {
                position: 'bottom'
            },
            plotOptions: {
                polarArea: {
                    spokes: {
                        connectorColors: 'var(--fuse-border)'
                    },
                    rings : {
                        strokeColor: 'var(--fuse-border)'
                    }
                }
            },
            series     : this.data.taskDistribution.series,
            states     : {
                hover: {
                    filter: {
                        type : 'darken',
                        value: 0.75
                    }
                }
            },
            stroke     : {
                width: 2
            },
            theme      : {
                monochrome: {
                    enabled       : true,
                    color         : '#93C5FD',
                    shadeIntensity: 0.75,
                    shadeTo       : 'dark'
                }
            },
            tooltip    : {
                followCursor: true,
                theme       : 'dark'
            },
            yaxis      : {
                labels: {
                    style: {
                        colors: 'var(--fuse-text-secondary)'
                    }
                }
            }
        };

        // Budget distribution
        this.chartBudgetDistribution = {
            chart      : {
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'radar',
                sparkline : {
                    enabled: true
                }
            },
            colors     : ['#818CF8'],
            dataLabels : {
                enabled   : true,
                formatter : (val: number): string | number => `${val}%`,
                textAnchor: 'start',
                style     : {
                    fontSize  : '13px',
                    fontWeight: 500
                },
                background: {
                    borderWidth: 0,
                    padding    : 4
                },
                offsetY   : -15
            },
            markers    : {
                strokeColors: '#818CF8',
                strokeWidth : 4
            },
            plotOptions: {
                radar: {
                    polygons: {
                        strokeColors   : 'var(--fuse-border)',
                        connectorColors: 'var(--fuse-border)'
                    }
                }
            },
            series     : this.data.budgetDistribution.series,
            stroke     : {
                width: 2
            },
            tooltip    : {
                theme: 'dark',
                y    : {
                    formatter: (val: number): string => `${val}%`
                }
            },
            xaxis      : {
                labels    : {
                    show : true,
                    style: {
                        fontSize  : '12px',
                        fontWeight: '500'
                    }
                },
                categories: this.data.budgetDistribution.categories
            },
            yaxis      : {
                max       : (max: number): number => parseInt((max + 10).toFixed(0), 10),
                tickAmount: 7
            }
        };

        // Weekly expenses
        this.chartWeeklyExpenses = {
            chart  : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'line',
                sparkline : {
                    enabled: true
                }
            },
            colors : ['#22D3EE'],
            series : this.data.weeklyExpenses.series,
            stroke : {
                curve: 'smooth'
            },
            tooltip: {
                theme: 'dark'
            },
            xaxis  : {
                type      : 'category',
                categories: this.data.weeklyExpenses.labels
            },
            yaxis  : {
                labels: {
                    formatter: (val): string => `$${val}`
                }
            }
        };

        // Monthly expenses
        this.chartMonthlyExpenses = {
            chart  : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'line',
                sparkline : {
                    enabled: true
                }
            },
            colors : ['#4ADE80'],
            series : this.data.monthlyExpenses.series,
            stroke : {
                curve: 'smooth'
            },
            tooltip: {
                theme: 'dark'
            },
            xaxis  : {
                type      : 'category',
                categories: this.data.monthlyExpenses.labels
            },
            yaxis  : {
                labels: {
                    formatter: (val): string => `$${val}`
                }
            }
        };

        // Yearly expenses
        this.chartYearlyExpenses = {
            chart  : {
                animations: {
                    enabled: false
                },
                fontFamily: 'inherit',
                foreColor : 'inherit',
                height    : '100%',
                type      : 'line',
                sparkline : {
                    enabled: true
                }
            },
            colors : ['#FB7185'],
            series : this.data.yearlyExpenses.series,
            stroke : {
                curve: 'smooth'
            },
            tooltip: {
                theme: 'dark'
            },
            xaxis  : {
                type      : 'category',
                categories: this.data.yearlyExpenses.labels
            },
            yaxis  : {
                labels: {
                    formatter: (val): string => `$${val}`
                }
            }
        };
    }
    wordCount: number = 0;
    descriptionError: boolean = false;
  
    // Method to handle input change, word count, and character validation
    onDescriptionChange(event: any): void {
      this.wordCount = this.getWordCount(event);
  
      // Validate the character count
      this.descriptionError = event.length > 255;
    }
  
    // Method to calculate word count
    getWordCount(text: string): number {
      const words = text.trim().split(/\s+/);
      return words.filter(word => word.length > 0).length;
    }
}
