import { TestBed } from '@angular/core/testing';

import { GooglecalendarService } from './googlecalendar.service';

describe('GooglecalendarService', () => {
  let service: GooglecalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GooglecalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
