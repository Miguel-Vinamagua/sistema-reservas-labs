import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { studentGuard } from './core/auth/auth.guard';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('protects the student workspace routes with the student role guard', () => {
    for (const path of ['laboratorios', 'mis-reservas', 'horarios']) {
      const route = routes.find((item) => item.path === path);
      expect(route?.canActivate).toContain(studentGuard);
    }
  });

  it('redirects the legacy reservation route to the session catalog', () => {
    expect(routes.find((item) => item.path === 'reservas/nueva')?.redirectTo)
      .toBe('laboratorios');
  });
});
