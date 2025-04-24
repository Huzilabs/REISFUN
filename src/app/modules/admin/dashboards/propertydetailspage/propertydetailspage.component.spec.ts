import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertydetailspageComponent } from './propertydetailspage.component';

describe('PropertydetailspageComponent', () => {
  let component: PropertydetailspageComponent;
  let fixture: ComponentFixture<PropertydetailspageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PropertydetailspageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PropertydetailspageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
