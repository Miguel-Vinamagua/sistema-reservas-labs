import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('submits credentials and navigates to the requested return URL', () => {
    auth.login.and.returnValue(of({ data: { token: 'jwt', user: { id: '1', correo: 'a@b.c', rol: 'estudiante' } } }));
    fixture.componentInstance.form.setValue({ correo: 'a@b.c', password: 'secret' });
    fixture.componentInstance.returnUrl = '/reservas';

    fixture.componentInstance.submit();

    expect(auth.login).toHaveBeenCalledWith({ correo: 'a@b.c', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/reservas');
  });

  it('redirects teachers to their workspace when no return URL was requested', () => {
    auth.login.and.returnValue(of({
      data: { token: 'jwt', user: { id: '1', correo: 'docente@utmachala.edu.ec', rol: 'docente' } }
    }));
    fixture.componentInstance.form.setValue({ correo: 'docente@utmachala.edu.ec', password: 'secret' });
    fixture.componentInstance.returnUrl = '/laboratorios';

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/docente');
  });

  it('redirects students to Laboratorios after login by default', () => {
    auth.login.and.returnValue(of({
      data: { token: 'jwt', user: { id: '1', correo: 'estudiante@utmachala.edu.ec', rol: 'estudiante' } }
    }));
    fixture.componentInstance.form.setValue({
      correo: 'estudiante@utmachala.edu.ec',
      password: 'secret'
    });
    fixture.componentInstance.returnUrl = null;

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/laboratorios');
  });

  it('redirects administrators to laboratory administration by default', () => {
    auth.login.and.returnValue(of({
      data: { token: 'jwt', user: { id: '1', correo: 'admin@utmachala.edu.ec', rol: 'administrador' } }
    }));
    fixture.componentInstance.form.setValue({
      correo: 'admin@utmachala.edu.ec',
      password: 'secret'
    });
    fixture.componentInstance.returnUrl = null;

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/laboratorios/admin');
  });

  it('shows a safe API error when login fails', () => {
    auth.login.and.returnValue(throwError(() => new Error('failure')));
    errors.getMessage.and.returnValue('No se pudo completar la solicitud.');
    fixture.componentInstance.form.setValue({ correo: 'a@b.c', password: 'wrong' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo completar la solicitud.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});