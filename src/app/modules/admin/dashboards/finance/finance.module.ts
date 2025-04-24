import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedModule } from 'app/shared/shared.module';
import { FinanceComponent } from 'app/modules/admin/dashboards/finance/finance.component';
import { financeRoutes } from 'app/modules/admin/dashboards/finance/finance.routing';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
// import { PropertyDetailDialogComponent } from 'app/modules/admin/dashboards/finance/finance.component';
// import { ProfitDialogComponent } from 'app/modules/admin/dashboards/finance/profit-dialog/profit-dialog.component'; 
// import { ProfitDialogComponent } from 'app/modules/admin/dashboards/finance/finance.component';
import { MatFormFieldModule } from '@angular/material/form-field';  // Import MatFormFieldModule
import { MatInputModule } from '@angular/material/input';  // Import MatInputModule
import { MatSelect, MatSelectModule } from '@angular/material/select';

@NgModule({
  declarations: [
    FinanceComponent,
  ],
  imports: [
    RouterModule.forChild(financeRoutes),
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    NgApexchartsModule,
    SharedModule,
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSortModule,
    MatTableModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,  // Add MatFormFieldModule here
    MatInputModule       // Add MatInputModule here
  ],
  exports: [FinanceComponent],
  entryComponents: []
})
export class FinanceModule {}
