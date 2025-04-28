import { NgModule } from '@angular/core';
import { RouterModule, Route } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FuseHighlightModule } from '@fuse/components/highlight';
import { SharedModule } from 'app/shared/shared.module';
import { FormsFieldsComponent } from 'app/modules/admin/ui/forms/fields/fields.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { Toast, ToastrModule } from 'ngx-toastr';

const routes: Route[] = [
  {
    path: '',
    component: FormsFieldsComponent
  }
];

@NgModule({
  declarations: [FormsFieldsComponent],
  imports: [
    RouterModule.forChild(routes),
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    FuseHighlightModule,
    SharedModule,
    CommonModule,
    ReactiveFormsModule,
    MatMomentDateModule,
    ToastrModule

  ],
  exports: [FormsFieldsComponent]

})
export class FormsFieldsModule { }
