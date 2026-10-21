import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService, TokenStorageService]
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    http.verify();
    tokenStorage.clearToken();
  });

  it('uses the configured API base URL and adds the stored bearer token', () => {
    tokenStorage.setToken('signed-token');

    api.get('/reservas').subscribe();

    const request = http.expectOne(`${environment.apiBaseUrl}/reservas`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush({ data: [] });
  });
});