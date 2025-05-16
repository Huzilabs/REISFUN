import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MaintenanceComponent } from 'app/modules/admin/pages/maintenance/maintenance.component';
import { maintenanceRoutes } from 'app/modules/admin/pages/maintenance/maintenance.routing';

@NgModule({
    declarations: [
        MaintenanceComponent,
        
    ],  
    imports     : [
        RouterModule.forChild(maintenanceRoutes),
        CommonModule
    ]
})
export class MaintenanceModule
{
}
