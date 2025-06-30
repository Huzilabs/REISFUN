/* eslint-disable */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RehabComponent } from './rehab.component';
import { Route, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

export const routes: Route[] = [
    {
        path: '',
        component: RehabComponent,
    },
];
@NgModule({
    declarations: [RehabComponent],
    imports: [CommonModule, RouterModule.forChild(routes)
        , FormsModule,
        ReactiveFormsModule,
        CommonModule
    ],

    exports: [RehabComponent],
})
export class RehabModule {}
