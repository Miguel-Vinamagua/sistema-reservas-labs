import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel" aria-labelledby="login-title">
        <p class="institution-label">Universidad · Espacios académicos</p>
        <h1 id="login-title">Reservas de laboratorios</h1>
        <p class="login-intro">Inicia sesión con tu cuenta institucional.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="correo">Correo institucional</label>
          <input
            id="correo"
            type="email"
            autocomplete="username"
            formControlName="correo"
            required
          />
          @if (form.controls.correo.touched && form.controls.correo.invalid) {
            <p class="field-error">Ingresa un correo válido.</p>
          }

          <label for="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            formControlName="password"
            required
          />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <p class="field-error">La contraseña es obligatoria.</p>
          }

          @if (errorMessage) {
            <p class="form-error" role="alert">{{ errorMessage }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Ingresando…' : 'Iniciar sesión' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: linear-gradient(135deg, #e8f2ef 0%, #f7f4ec 58%, #e9eeef 100%);
      color: #1e302d;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .login-panel {
      width: min(100%, 420px);
      padding: 36px;
      border: 1px solid #cbd8d2;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 18px 50px rgba(32, 56, 49, 0.1);
    }
    .institution-label {
      margin: 0 0 14px;
      color: #467366;
      font: 700 12px/1.4 Arial, sans-serif;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: 32px; line-height: 1.1; }
    .login-intro { margin: 12px 0 28px; color: #52635e; font: 15px/1.5 Arial, sans-serif; }
    form { display: grid; gap: 10px; }
    label { margin-top: 8px; font: 700 13px/1.4 Arial, sans-serif; }
    input {
      width: 100%;
      min-height: 44px;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #aabbb4;
      border-radius: 4px;
      background: #fff;
      color: #1e302d;
      font: 15px Arial, sans-serif;
    }
    input:focus { outline: 3px solid #b7d8cc; border-color: #467366; }
    .field-error, .form-error { margin: 0; color: #a12f28; font: 13px/1.4 Arial, sans-serif; }
    .form-error { padding: 10px; border-left: 3px solid #a12f28; background: #fff1ee; }
    button {
      min-height: 46px;
      margin-top: 12px;
      border: 0;
      border-radius: 4px;
      background: #286455;
      color: white;
      cursor: pointer;
      font: 700 14px Arial, sans-serif;
    }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    @media (max-width: 480px) { .login-panel { padding: 26px 22px; } h1 { font-size: 28px; } }
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly errors = inject(ErrorMessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });
  returnUrl = this.safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  errorMessage: string | null = null;
  submitting = false;

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.submitting = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.submitting = false;
        void this.router.navigateByUrl(
          response.data.user.rol === 'docente'
            ? '/docente'
            : this.returnUrl ?? this.defaultRoute(response.data.user.rol)
        );
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage = this.errors.getMessage(error);
      }
    });
  }

  private safeReturnUrl(value: string | null): string | null {
    return value?.startsWith('/') && !value.startsWith('//') ? value : null;
  }

  private defaultRoute(role: 'estudiante' | 'docente' | 'administrador'): string {
    if (role === 'docente') {
      return '/docente';
    }
    if (role === 'administrador') {
      return '/laboratorios/admin';
    }
    return '/laboratorios';
  }
}