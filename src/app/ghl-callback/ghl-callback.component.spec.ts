import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GhlCallbackComponent } from './ghl-callback.component';

describe('GhlCallbackComponent', () => {
  let component: GhlCallbackComponent;
  let fixture: ComponentFixture<GhlCallbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GhlCallbackComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GhlCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
