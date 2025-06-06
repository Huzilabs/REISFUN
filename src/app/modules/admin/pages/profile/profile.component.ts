import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { GhlIntegrationService } from 'app/shared/GHLintegration.service';
import { Router } from '@angular/router';

@Component({
    selector       : 'profile',
    templateUrl    : './profile.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent
{
    /**
     * Constructor  
     */
    constructor(
        private ghlService: GhlIntegrationService,
        private router : Router
    )
    { 
        
        

    }
    
    ngOnInit(): void {
  this.ghlService.initialize();
  this.router.navigateByUrl('/dashboards/reporting');
}
}
