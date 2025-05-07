import { TestBed } from '@angular/core/testing';

import { UrlCodeService } from './urlservice.service';

describe('UrlserviceService', () => {
  let service: UrlCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UrlCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
