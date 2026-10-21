import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '../api/api.service';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
        AuthService,
        TokenStorageService
      ]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.clearToken();
  });

  afterEach(() => {
    http.verify();
    tokenStorage.clearToken();
  });

  it('posts credentials to login and stores the returned JWT', () => {
    let result: unknown;
    auth.login({ correo: 'student@university.edu', password: 'secret' }).subscribe((response) => {
      result = response;
    });

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ correo: 'student@university.edu', password: 'secret' });
    request.flush({
      data: {
        token: 'jwt-from-api',
        user: { id: 'user-id', correo: 'student@university.edu', rol: 'estudiante' }
      }
    });

    expect(tokenStorage.getToken()).toBe('jwt-from-api');
    expect(result).toEqual(jasmine.objectContaining({ data: jasmine.objectContaining({ token: 'jwt-from-api' }) }));
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('removes the stored token on logout', () => {
    tokenStorage.setToken('jwt-from-api');

    auth.logout();

    expect(tokenStorage.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
  });
});