import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExtraOptions, PreloadAllModules, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { FuseModule } from '@fuse';
import { FuseConfigModule } from '@fuse/services/config';
import { FuseMockApiModule } from '@fuse/lib/mock-api';
import { CoreModule } from 'app/core/core.module';
import { appConfig } from 'app/core/config/app.config';
import { mockApiServices } from 'app/mock-api';
import { LayoutModule } from 'app/layout/layout.module';
import { AppComponent } from 'app/app.component';
import { appRoutes } from 'app/app.routing';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastrModule } from 'ngx-toastr';
// import { GoogleMapsModule } from '@angular/google-maps';
// import { PropertydetailspageComponent } from './modules/admin/apps/dashboard/propertydetailspage/propertydetailspage.component';
const routerConfig: ExtraOptions = {
    preloadingStrategy       : PreloadAllModules,
    scrollPositionRestoration: 'enabled'
};
  
@NgModule({
    declarations: [
        AppComponent

    ],
    imports     : [
        CommonModule,  
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        ReactiveFormsModule,
        BrowserModule,
        RouterModule.forRoot(appRoutes, routerConfig),

        // Fuse, FuseConfig & FuseMockAPI
        FuseModule,
        FuseConfigModule.forRoot(appConfig),
        FuseMockApiModule.forRoot(mockApiServices),

        // Core module of your application
        CoreModule,

        // Layout module of your application
        LayoutModule,

        // 3rd party modules that require global configuration via forRoot
        MarkdownModule.forRoot({}),
        MatButtonModule,
        MatDialogModule,
        MatIconModule,  
        MatSortModule,
        
        // GoogleMapsModule,
        MatTableModule,
        BrowserAnimationsModule,
        ToastrModule.forRoot({  
            positionClass: 'toast-top-right',  
            timeOut: 3000,                    
            preventDuplicates: true,          
            closeButton: true,                
            progressBar: true,
            maxOpened:5,              
          }),
    ],
    bootstrap   : [
        AppComponent
    ]
})
export class AppModule
{
}
   