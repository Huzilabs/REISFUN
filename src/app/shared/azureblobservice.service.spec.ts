import { TestBed } from '@angular/core/testing';

import { Azureblobservice } from './azureblobservice.service';
describe('AzureblobserviceService', () => {
  let service: Azureblobservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Azureblobservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
