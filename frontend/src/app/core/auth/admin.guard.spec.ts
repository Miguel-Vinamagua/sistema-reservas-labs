import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  it('allows administrators to access laboratory management', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAdministrator: () => true } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, { url: '/laboratorios/admin' } as never));

    expect(result).toBeTrue();
  });

  it('redirects non-administrators back to the catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAdministrator: () => false } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, { url: '/laboratorios/admin' } as never));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/laboratorios');
  });
});