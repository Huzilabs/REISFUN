import { TestBed } from '@angular/core/testing';

// import { UrlCodeService } from './urlservice.service';
import { GhlIntegrationService } from './GHLintegration.service';

describe('UrlserviceService', () => {
  let service: GhlIntegrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GhlIntegrationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
