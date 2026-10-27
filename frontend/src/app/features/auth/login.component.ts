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
      <div class="login-decoration-ring"></div>
      <section class="login-panel" aria-labelledby="login-title">
        <div class="panel-header">
          <span class="institution-badge">Universidad · Espacios Académicos</span>
          <h1 id="login-title">Reservas de Laboratorios</h1>
          <p class="login-intro">Ingresa con tus credenciales institucionales para continuar.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="input-group">
            <label for="correo">Correo institucional</label>
            <input
              id="correo"
              type="email"
              autocomplete="username"
              formControlName="correo"
              placeholder="nombre.apellido&#64;utmachala.edu.ec"
              required
            />
            @if (form.controls.correo.touched && form.controls.correo.invalid) {
              <p class="field-error">Por favor, ingresa un correo válido.</p>
            }
          </div>

          <div class="input-group">
            <label for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autocomplete="current-password"
              formControlName="password"
              placeholder="••••••••••••"
              required
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="field-error">La contraseña es obligatoria.</p>
            }
          </div>

          @if (errorMessage) {
            <div class="form-error-wrapper" role="alert">
              <span class="error-icon">⚠️</span>
              <p class="form-error">{{ errorMessage }}</p>
            </div>
          }

          <button type="submit" [disabled]="form.invalid || submitting">
            @if (submitting) {
              <span class="spinner"></span>
              <span>Validando acceso…</span>
            } @else {
              <span>Iniciar sesión</span>
            }
          </button>
        </form>
      </section>
      <footer class="login-footer">
        <p>&copy; 2026 Sistema de Gestión de Laboratorios</p>
      </footer>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    
    .login-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 24px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
      overflow: hidden;
    }

    /* Elementos decorativos sutiles de fondo */
    .login-page::before {
      content: '';
      position: absolute;
      width: 600px;
      height: 600px;
      background: rgba(37, 99, 235, 0.03);
      border-radius: 50%;
      top: -150px;
      left: -150px;
      z-index: 0;
    }

    .login-panel {
      width: min(100%, 440px);
      padding: 42px 38px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      z-index: 1;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .panel-header {
      margin-bottom: 28px;
    }

    .institution-badge {
      display: inline-block;
      margin-bottom: 12px;
      padding: 4px 12px;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 11px; 
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-radius: 20px;
    }

    h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .login-intro { 
      margin: 8px 0 0; 
      color: #475569; 
      font-size: 14px; 
      line-height: 1.5; 
    }

    form { 
      display: flex;
      flex-direction: column;
      gap: 18px; 
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label { 
      font-weight: 600; 
      font-size: 13px; 
      color: #1e293b; 
    }

    input {
      width: 100%;
      height: 48px;
      box-sizing: border-box;
      padding: 0 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 15px;
      transition: all 0.2s ease;
    }

    input:focus { 
      outline: none;
      border-color: #2563eb; 
      background: #fff;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    input::placeholder {
      color: #94a3b8;
    }

    .field-error { 
      margin: 2px 0 0; 
      color: #dc2626; 
      font-size: 12px; 
      font-weight: 500; 
    }

    .form-error-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 8px;
      border-left: 3.5px solid #dc2626;
      background: #fef2f2;
    }

    .error-icon {
      font-size: 14px;
      line-height: 1;
    }

    .form-error { 
      margin: 0; 
      color: #991b1b; 
      font-size: 13px; 
      line-height: 1.4;
      font-weight: 500;
    }

    button {
      height: 48px;
      margin-top: 6px;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    button:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
      transform: translateY(-1px);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled { 
      cursor: not-allowed; 
      opacity: 0.6; 
      box-shadow: none;
    }

    /* Animación de carga para el botón */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-footer {
      margin-top: 24px;
      z-index: 1;
    }

    .login-footer p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      letter-spacing: 0.02em;
    }

    @media (max-width: 480px) { 
      .login-panel { 
        padding: 30px 22px; 
        border: none;
        background: transparent;
        box-shadow: none;
      } 
      h1 { 
        font-size: 24px; 
      } 
    }
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