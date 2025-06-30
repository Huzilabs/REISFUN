import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RehabComponent } from './rehab.component';

describe('RehabComponent', () => {
  let component: RehabComponent;
  let fixture: ComponentFixture<RehabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RehabComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RehabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
