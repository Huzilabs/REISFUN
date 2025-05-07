import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { Navigation } from 'app/core/navigation/navigation.types';
import { NavigationService } from 'app/core/navigation/navigation.service';
// import { GhlIntegrationService } from 'app/services/ghl-integration.service';  // Import GhlIntegrationService
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';
import { environment } from 'environments/environment';

@Component({
  selector: 'classy-layout',
  templateUrl: './classy.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClassyLayoutComponent implements OnInit, OnDestroy {
  isScreenSmall: boolean;
  navigation: Navigation;
  user: { id: string, name: string, email: string } = { id: '', name: '', email: '' };  // Define user object manually
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  
  accessToken: string | null = null;
  userType: string | null = null;
  userId: string | null = null;
  userDetails: any = null;
  errorMessage: string | null = null;

  constructor(
    private _router: Router,
    private _navigationService: NavigationService,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _fuseNavigationService: FuseNavigationService,
    private _ghlIntegrationService: GhlIntegrationService  // Inject GhlIntegrationService
  ) {}

  get currentYear(): number {
    return new Date().getFullYear();
  }

  ngOnInit(): void {
    // Fetch navigation data
    this._ghlIntegrationService.initialize();

    this._navigationService.navigation$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((navigation: Navigation) => {
        this.navigation = navigation;
      });

    // Listen for media changes to adjust screen size logic
    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        this.isScreenSmall = !matchingAliases.includes('md');
      });

    // Fetch user details from GhlIntegrationService
    this._ghlIntegrationService.getAccessToken()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(token => {
        if (token) {
          this.accessToken = token;
          console.log('Access Token:', this.accessToken);
        }
      });

    this._ghlIntegrationService.getUserType()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(type => {
        if (type) {
          this.userType = type;
          console.log('User Type:', this.userType);
        }
      });

      this._ghlIntegrationService.getUserDetails()
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(details => {
        if (details) {
          this.userDetails = details;
          this.user = {
            id: details.id,
            name: details.name || `${details.firstName} ${details.lastName}`,
            email: details.email
          };
          console.log('User Details:', this.userDetails);
          console.log('User Object:', this.user);
        }
      });
      }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  toggleNavigation(name: string): void {
    const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);
    if (navigation) {
      navigation.toggle();
    }
  }
}
