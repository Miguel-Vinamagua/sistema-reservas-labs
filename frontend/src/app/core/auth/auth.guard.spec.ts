import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('redirects unauthenticated users to login with their return URL', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/home' } as never));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fhome');
  });

  it('allows authenticated users through', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => true } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/home' } as never));

    expect(result).toBeTrue();
  });
});