import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, studentGuard } from './auth.guard';

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

  it('allows only authenticated students through student routes', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true, getRole: () => 'estudiante' }
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() => (
      studentGuard({} as never, { url: '/mis-reservas' } as never)
    ));

    expect(result).toBeTrue();
  });

  it('redirects unauthenticated users from student routes to login', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => (
      studentGuard({} as never, { url: '/horarios' } as never)
    ));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree))
      .toBe('/login?returnUrl=%2Fhorarios');
  });

  it('redirects teachers and administrators away from student-only routes', () => {
    for (const [role, expectedUrl] of [
      ['docente', '/docente'],
      ['administrador', '/laboratorios/admin']
    ] as const) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: { isAuthenticated: () => true, getRole: () => role } }
        ]
      });

      const result = TestBed.runInInjectionContext(() => (
        studentGuard({} as never, { url: '/mis-reservas' } as never)
      ));

      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(expectedUrl);
    }
  });

  it('keeps the existing laboratory catalog accessible to teachers', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => true, getRole: () => 'docente' } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => (
      studentGuard({} as never, { url: '/laboratorios' } as never)
    ));

    expect(result).toBeTrue();
  });
});