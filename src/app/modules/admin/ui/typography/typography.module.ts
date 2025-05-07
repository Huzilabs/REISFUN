import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { FuseHighlightModule } from '@fuse/components/highlight';
import { SharedModule } from 'app/shared/shared.module';
import { TypographyComponent } from 'app/modules/admin/ui/typography/typography.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { HttpClientModule } from '@angular/common/http';

export const routes: Route[] = [
    {
        path     : '',
        component: TypographyComponent
    }
];

@NgModule({
    declarations: [
        TypographyComponent
    ],
    imports     : [
        RouterModule.forChild(routes),
        MatTabsModule,
        FuseHighlightModule,
        SharedModule,
        MatFormFieldModule,
        MatSelectModule,
        HttpClientModule
    ]
})
export class TypographyModule
{
}
