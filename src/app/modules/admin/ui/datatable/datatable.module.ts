import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { DatatableComponent } from 'app/modules/admin/ui/datatable/datatable.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

export const routes: Route[] = [
    {
        path     : '',
        component: DatatableComponent
    }
];

@NgModule({
    declarations: [
        DatatableComponent
    ],
    imports     : [
        RouterModule.forChild(routes),
        SharedModule,
        MatButtonModule,
                MatCheckboxModule,
                MatFormFieldModule,
                MatIconModule,
                MatInputModule,
                MatMenuModule,
                MatSidenavModule,
                SharedModule,
                CommonModule,
                RouterModule,
                HttpClientModule
    ]
})
export class DatatableModule
{
}
