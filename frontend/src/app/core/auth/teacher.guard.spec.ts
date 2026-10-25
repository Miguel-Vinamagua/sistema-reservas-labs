import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { teacherGuard } from './teacher.guard';

describe('teacherGuard', () => {
  it('allows authenticated teachers to access their sessions', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            getRole: () => 'docente'
          }
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() => (
      teacherGuard({} as never, { url: '/docente/sesiones' } as never)
    ));

    expect(result).toBeTrue();
  });

  it('redirects non-teachers to the laboratory catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            getRole: () => 'estudiante'
          }
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() => (
      teacherGuard({} as never, { url: '/docente/sesiones' } as never)
    ));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/laboratorios');
  });
});
