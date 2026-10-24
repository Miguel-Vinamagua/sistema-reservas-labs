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

    expect(tokenStorage.getUserEmail()).toBe('student@university.edu');
    expect(auth.userEmail()).toBe('student@university.edu');
    
    expect(result).toEqual(jasmine.objectContaining({ data: jasmine.objectContaining({ token: 'jwt-from-api' }) }));
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('removes the stored token on logout', () => {
    tokenStorage.setToken('jwt-from-api');
    tokenStorage.setUserEmail('student@university.edu');

    auth.logout();

    expect(tokenStorage.getToken()).toBeNull();
    expect(tokenStorage.getUserEmail()).toBeNull();
    expect(auth.userEmail()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
  });

  it('reads the administrator role from the stored token for client-side controls', () => {
    const payload = btoa(JSON.stringify({ rol: 'administrador' }))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    tokenStorage.setToken(`header.${payload}.signature`);

    expect(auth.getRole()).toBe('administrador');
    expect(auth.isAdministrator()).toBeTrue();
  });

  it('fails closed when the stored token has an unknown role', () => {
    const payload = btoa(JSON.stringify({ rol: 'superadmin' }))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    tokenStorage.setToken(`header.${payload}.signature`);

    expect(auth.getRole()).toBeNull();
    expect(auth.isAdministrator()).toBeFalse();
  });
});