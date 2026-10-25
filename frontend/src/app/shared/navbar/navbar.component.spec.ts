import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;
  let authenticated: boolean;
  let administrator: boolean;
  let role: 'estudiante' | 'docente' | 'administrador';
  let userEmail: ReturnType<typeof signal<string | null>>;
  let logout: jasmine.Spy;

  beforeEach(async () => {
    authenticated = false;
    administrator = false;
    role = 'estudiante';
    userEmail = signal<string | null>(null);
    logout = jasmine.createSpy('logout').and.callFake(() => {
      authenticated = false;
      administrator = false;
      userEmail.set(null);
    });

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            userEmail,
            isAuthenticated: () => authenticated,
            isAdministrator: () => administrator,
            getRole: () => role,
            logout
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('shows only the login option while logged out', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Iniciar sesión');
    expect(text).not.toContain('Cerrar sesión');
    const protectedLinks = fixture.nativeElement.querySelectorAll(
      'a[href="/laboratorios"], a[href="/mis-reservas"], a[href="/reservas/nueva"], a[href="/laboratorios/admin"]'
    );
    expect(protectedLinks.length).toBe(0);
  });

  it('shows only administrator navigation for administrators', () => {
    authenticated = true;
    administrator = true;
    role = 'administrador';
    userEmail.set('admin@universidad.edu');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('admin@universidad.edu');
    expect(text).toContain('Administrar');
    expect(text).not.toContain('Nueva reserva');
    expect(text).toContain('Cerrar sesión');
    expect(text).not.toContain('Iniciar sesión');
  });

  it('shows the sessions dashboard to teachers', () => {
    authenticated = true;
    role = 'docente';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mis sesiones');
    expect(fixture.nativeElement.querySelector('a[href="/docente"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Administrar');
  });

  it('clears the session and navigates to login on logout', () => {
    authenticated = true;
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector(
      'button:not([aria-controls])'
    ) as HTMLButtonElement;
    logoutButton.click();

    expect(logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
