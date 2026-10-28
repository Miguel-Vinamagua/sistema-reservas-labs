import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { interval } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from '../laboratorios/laboratorios.service';
import {
  MateriaDocente,
  NuevaSesionLaboratorio,
  SesionLaboratorio,
  SesionesService
} from './sesiones.service';

function sessionTimeRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('horaInicio')?.value as string | null;
  const end = control.get('horaFin')?.value as string | null;
  return start && end && end <= start ? { invalidTimeRange: true } : null;
}

function nonBlankValidator(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim()
    ? null
    : { required: true };
}

function notPastDateValidator(today: string): ValidatorFn {
  return (control) => (
    typeof control.value === 'string' && control.value >= today
      ? null
      : { pastDate: true }
  );
}

function sessionStartNotPastValidator(control: AbstractControl): ValidationErrors | null {
  const date = control.get('fecha')?.value as string | null;
  const time = control.get('horaInicio')?.value as string | null;
  if (!date || !time) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  return start.getTime() > Date.now() ? null : { pastStart: true };
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

@Component({
  selector: 'app-sesiones-docente',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <main class="teacher-page">
      <div class="teacher-container">
        <header class="page-header">
          <span class="eyebrow">Panel docente</span>
          <h1>Sesiones de laboratorio</h1>
          <p class="intro">Programa una actividad académica y consulta el estado en tiempo real de las sesiones que has creado.</p>
        </header>

        <section class="pro-card create-section mb-32" aria-labelledby="create-session-heading">
          <h2 id="create-session-heading" class="section-title">Crear una sesión</h2>
          @if (loadingLaboratories() || loadingSubjects()) {
            <div class="state-container compact" role="status">
              <div class="spinner-small-dark"></div>
              <p class="status">Cargando laboratorios y materias…</p>
            </div>
          } @else if (laboratoryError()) {
            <div class="alert-box error mt-4" role="alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ laboratoryError() }}</p>
            </div>
          } @else if (subjectsError()) {
            <div class="alert-box error mt-4" role="alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ subjectsError() }}</p>
            </div>
          } @else if (laboratories().length === 0) {
            <div class="alert-box warning mt-4">
              <p>No hay laboratorios activos disponibles.</p>
            </div>
          } @else if (subjects().length === 0) {
            <div class="alert-box warning mt-4">
              <p>No tienes materias asignadas para crear sesiones.</p>
            </div>
          } @else {
            <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="input-group full-width">
                <label for="laboratorio">Laboratorio</label>
                <select id="laboratorio" class="pro-input" formControlName="laboratorioId">
                  <option value="">Selecciona un laboratorio</option>
                  @for (laboratory of laboratories(); track laboratory.id) {
                    <option [value]="laboratory.id">{{ laboratory.nombre }} · {{ laboratory.capacidad }} puestos · {{ laboratory.ubicacion }}</option>
                  }
                </select>
                @if (form.controls.laboratorioId.touched && form.controls.laboratorioId.invalid) {
                  <span class="field-error" role="alert">Selecciona un laboratorio.</span>
                }
              </div>

              <div class="input-group">
                <label for="materia">Materia</label>
                <select id="materia" class="pro-input" formControlName="materia">
                  <option value="">Selecciona una materia</option>
                  @for (subject of subjects(); track subject.id) {
                    <option [value]="subject.nombre">{{ subject.nombre }} · {{ subject.codigo }}</option>
                  }
                </select>
                @if (form.controls.materia.touched && form.controls.materia.invalid) {
                  <span class="field-error" role="alert">Selecciona una materia.</span>
                }
              </div>

              <div class="input-group">
                <label for="actividad">Actividad</label>
                <input id="actividad" class="pro-input" type="text" formControlName="actividad" maxlength="200" placeholder="Ej. Práctica de óptica" />
                @if (form.controls.actividad.touched && form.controls.actividad.invalid) {
                  <span class="field-error" role="alert">Ingresa una actividad.</span>
                }
              </div>

              <div class="input-group">
                <label for="fecha">Fecha</label>
                <input id="fecha" class="pro-input" type="date" [min]="today" formControlName="fecha" />
                @if (form.controls.fecha.touched && form.controls.fecha.hasError('required')) {
                  <span class="field-error" role="alert">Selecciona una fecha.</span>
                } @else if (form.controls.fecha.touched && form.controls.fecha.hasError('pastDate')) {
                  <span class="field-error" role="alert">La fecha no puede estar en el pasado.</span>
                }
              </div>

              <div class="time-range-group">
                <div class="input-group">
                  <label for="horaInicio">Hora de inicio</label>
                  <input id="horaInicio" class="pro-input" type="time" formControlName="horaInicio" />
                  @if (form.controls.horaInicio.touched && form.controls.horaInicio.invalid) {
                    <span class="field-error" role="alert">Ingresa hora de inicio.</span>
                  }
                </div>
                <div class="input-group">
                  <label for="horaFin">Hora de fin</label>
                  <input id="horaFin" class="pro-input" type="time" formControlName="horaFin" />
                  @if (form.controls.horaFin.touched && form.controls.horaFin.invalid) {
                    <span class="field-error" role="alert">Ingresa hora de fin.</span>
                  }
                </div>
              </div>

              @if (form.errors?.['invalidTimeRange'] && form.controls.horaInicio.touched && form.controls.horaFin.touched) {
                <p class="field-error full-width" role="alert">La hora de fin debe ser posterior a la hora de inicio.</p>
              }
              @if (form.errors?.['pastStart']) {
                <p class="field-error full-width" role="alert">La fecha y hora de inicio no pueden estar en el pasado.</p>
              }
              @if (errorMessage()) {
                <div class="alert-box error full-width" role="alert">
                  <span class="alert-icon">⚠️</span>
                  <p>{{ errorMessage() }}</p>
                </div>
              }
              @if (successMessage()) {
                <div class="alert-box success full-width" role="status">
                  <span class="alert-icon">✓</span>
                  <p>{{ successMessage() }}</p>
                </div>
              }
              <button class="btn-action full-width-sm" type="submit" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <span class="spinner-small"></span>
                  <span>Creando sesión…</span>
                } @else {
                  <span>Crear sesión</span>
                }
              </button>
            </form>
          }
        </section>

        <section aria-labelledby="my-sessions-heading">
          <div class="sessions-header-row">
            <h2 id="my-sessions-heading" class="section-title">Mis sesiones programadas</h2>
            <button class="btn-secondary" type="button" [disabled]="loadingSessions()" (click)="loadSessions()">Actualizar lista</button>
          </div>

          @if (cancellationError()) {
            <div class="alert-box error mb-4" role="alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ cancellationError() }}</p>
            </div>
          }

          @if (loadingSessions()) {
            <div class="state-container" role="status">
              <div class="spinner-pro"></div>
              <p class="status">Cargando tus sesiones…</p>
            </div>
          } @else if (sessionsError()) {
            <div class="alert-box error" role="alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ sessionsError() }}</p>
            </div>
          } @else if (sessions().length === 0) {
            <div class="empty-state" data-testid="empty-state">
              <div class="empty-icon">📅</div>
              <h3>Sin sesiones creadas</h3>
              <p>Todavía no has registrado ninguna sesión de laboratorio.</p>
            </div>
          } @else {
            <div class="catalog-grid">
              @for (session of sessions(); track session.id) {
                @let status = effectiveSessionStatus(session);
                <article class="pro-card session-card">
                  <div class="card-top">
                    <div>
                      <h3>{{ session.materia }}</h3>
                      <p class="location-text"><span class="loc-icon">📌</span> {{ session.actividad }}</p>
                    </div>
                    <span class="status-badge"
                      [class.open]="status === 'abierta'"
                      [class.full]="status === 'llena'"
                      [class.inactive]="status === 'cancelada' || status === 'finalizada'">
                      {{ sessionStatusLabel(status) }}
                    </span>
                  </div>

                  <div class="session-details-grid">
                    <div class="detail-item"><span class="dt-label">Laboratorio</span><span class="dd-value">{{ session.laboratorio.nombre }}</span></div>
                    <div class="detail-item"><span class="dt-label">Ubicación</span><span class="dd-value">{{ session.laboratorio.ubicacion }}</span></div>
                    <div class="detail-item"><span class="dt-label">Fecha</span><span class="dd-value">{{ session.inicio | date:'longDate' }}</span></div>
                    <div class="detail-item"><span class="dt-label">Horario</span><span class="dd-value">{{ session.inicio | date:'shortTime' }} – {{ session.fin | date:'shortTime' }}</span></div>
                    <div class="detail-item full-span">
                      <span class="dt-label">Inscritos / Capacidad</span>
                      <span class="dd-value highlight-badge">{{ session.inscritosCount }} / {{ session.cupos }} cupos</span>
                    </div>
                  </div>

                  @if (status === 'abierta' || status === 'llena') {
                    <button
                      class="btn-cancel"
                      type="button"
                      [disabled]="cancellingSessionId() === session.id"
                      (click)="cancelSession(session)"
                    >
                      @if (cancellingSessionId() === session.id) {
                        <span class="spinner-small-red"></span>
                        <span>Cancelando sesión…</span>
                      } @else {
                        <span>Cancelar sesión</span>
                      }
                    </button>
                  }
                </article>
              }
            </div>
          }
        </section>
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }

    .teacher-page {
      min-height: 100vh;
      box-sizing: border-box;
      padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .teacher-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 40px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 24px;
    }

    .eyebrow {
      display: inline-block;
      margin: 0 0 10px;
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
      font-size: clamp(30px, 5vw, 46px);
      font-weight: 800;
      line-height: 1.1;
      color: #0f172a;
      letter-spacing: -0.03em;
    }

    .intro {
      margin: 10px 0 0;
      color: #475569;
      font-size: 15px;
    }

    .pro-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
      margin-bottom: 40px;
    }

    .create-section {
      border-top: 4px solid #2563eb;
    }

    .section-title {
      margin: 0 0 20px;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    .full-width {
      grid-column: 1 / -1;
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

    .pro-input {
      width: 100%;
      height: 46px;
      box-sizing: border-box;
      padding: 0 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #0f172a;
      font-size: 14.5px;
      font-family: inherit;
      transition: all 0.2s ease;
    }

    .pro-input:focus {
      outline: none;
      border-color: #2563eb;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .time-range-group {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }

    .field-error {
      margin: 2px 0 0;
      color: #dc2626;
      font-size: 12px;
      font-weight: 500;
    }

    .sessions-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .btn-secondary {
      height: 38px;
      padding: 0 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .session-card {
      border-left: 4px solid #2563eb;
      display: flex;
      flex-direction: column;
      margin-bottom: 0;
      padding: 24px;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .location-text {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 13.5px;
    }

    .status-badge {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 11.5px;
      letter-spacing: 0.02em;
    }

    .status-badge.open { background: #ecfdf5; color: #047857; }
    .status-badge.full { background: #fef3c7; color: #b45309; }
    .status-badge.inactive { background: #f1f5f9; color: #64748b; }

    .session-details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 16px;
      margin: 16px 0;
      background: #f8fafc;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #f1f5f9;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .full-span {
      grid-column: 1 / -1;
    }

    .dt-label {
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .dd-value {
      color: #1e293b;
      font-size: 13.5px;
      font-weight: 500;
      overflow-wrap: anywhere;
    }

    .highlight-badge {
      color: #2563eb;
      font-weight: 600;
    }

    .btn-action {
      height: 46px;
      width: 100%;
      margin-top: auto;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      transition: all 0.2s ease;
    }

    .btn-action:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
      transform: translateY(-1px);
    }

    .btn-action:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }

    .full-width-sm {
      grid-column: 1 / -1;
      justify-self: start;
      width: auto;
      min-width: 160px;
    }

    .btn-cancel {
      height: 42px;
      width: 100%;
      margin-top: auto;
      border: 1.5px solid #fca5a5;
      border-radius: 8px;
      background: #fef2f2;
      color: #dc2626;
      cursor: pointer;
      font-weight: 600;
      font-size: 13.5px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #dc2626;
      color: white;
      border-color: #dc2626;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
    }

    .btn-cancel:disabled {
      cursor: wait;
      opacity: 0.6;
    }

    .alert-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      margin-top: 16px;
    }

    .alert-box p { margin: 0; }
    .alert-box.success { border-left: 4px solid #059669; background: #ecfdf5; color: #065f46; }
    .alert-box.error { border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; }
    .alert-box.warning { border-left: 4px solid #d97706; background: #fffbeb; color: #92400e; }
    .alert-icon { font-weight: bold; }

    .state-container, .empty-state {
      text-align: center;
      padding: 50px 20px;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .state-container.compact {
      padding: 24px;
      box-shadow: none;
    }

    .status { margin: 0; color: #64748b; font-size: 14.5px; font-weight: 500; }
    .empty-icon { font-size: 36px; margin-bottom: 10px; }
    .empty-state h3 { margin: 0 0 6px; font-size: 17px; color: #0f172a; }
    .empty-state p { margin: 0; color: #64748b; font-size: 14px; }

    .spinner-pro {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(37, 99, 235, 0.15);
      border-radius: 50%;
      border-top-color: #2563eb;
      animation: spin 0.7s linear infinite;
    }

    .spinner-small, .spinner-small-dark, .spinner-small-red {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .spinner-small {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
    }

    .spinner-small-dark {
      border: 2px solid rgba(37, 99, 235, 0.2);
      border-top-color: #2563eb;
    }

    .spinner-small-red {
      border: 2px solid rgba(220, 38, 38, 0.3);
      border-top-color: #dc2626;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .form-grid, .time-range-group {
        grid-template-columns: 1fr;
      }
      .catalog-grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class SesionesDocenteComponent implements OnInit {
  private readonly laboratoriesService = inject(LaboratoriosService);
  private readonly sessionsService = inject(SesionesService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly laboratories = signal<Laboratorio[]>([]);
  readonly subjects = signal<MateriaDocente[]>([]);
  readonly sessions = signal<SesionLaboratorio[]>([]);
  readonly loadingLaboratories = signal(true);
  readonly loadingSubjects = signal(true);
  readonly loadingSessions = signal(true);
  readonly submitting = signal(false);
  readonly cancellingSessionId = signal<string | null>(null);
  readonly laboratoryError = signal<string | null>(null);
  readonly subjectsError = signal<string | null>(null);
  readonly sessionsError = signal<string | null>(null);
  readonly cancellationError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly today = localDateString(new Date());

  readonly form = new FormGroup({
    laboratorioId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notPastDateValidator(this.today)]
    }),
    horaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    materia: new FormControl('', { nonNullable: true, validators: [nonBlankValidator] }),
    actividad: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankValidator, Validators.maxLength(200)]
    })
  }, { validators: [sessionTimeRangeValidator, sessionStartNotPastValidator] });

  ngOnInit(): void {
    this.laboratoriesService.getActiveLaboratories().subscribe({
      next: (laboratories) => {
        this.laboratories.set(laboratories);
        this.loadingLaboratories.set(false);
      },
      error: (error: unknown) => {
        this.laboratoryError.set(this.errors.getMessage(error));
        this.loadingLaboratories.set(false);
      }
    });
    this.sessionsService.getMySubjects().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.loadingSubjects.set(false);
      },
      error: (error: unknown) => {
        this.subjectsError.set(this.errors.getMessage(error));
        this.loadingSubjects.set(false);
      }
    });
    this.loadSessions();
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSessions(false));
  }

  loadSessions(showLoading = true): void {
    if (showLoading) {
      this.loadingSessions.set(true);
    }
    this.sessionsError.set(null);
    this.sessionsService.getMySessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loadingSessions.set(false);
      },
      error: (error: unknown) => {
        this.sessionsError.set(this.errors.getMessage(error));
        this.loadingSessions.set(false);
      }
    });
  }

  sessionStatusLabel(status: SesionLaboratorio['estado']): string {
    switch (status) {
      case 'abierta':
        return 'Abierta';
      case 'llena':
        return 'Llena';
      case 'cancelada':
        return 'Cancelada';
      case 'finalizada':
        return 'Finalizada';
    }
  }

  effectiveSessionStatus(session: SesionLaboratorio): SesionLaboratorio['estado'] {
    if (
      (session.estado === 'abierta' || session.estado === 'llena') &&
      Date.now() > Date.parse(session.fin)
    ) {
      return 'finalizada';
    }

    return session.estado;
  }

  cancelSession(session: SesionLaboratorio): void {
    if (
      (session.estado !== 'abierta' && session.estado !== 'llena') ||
      !window.confirm('¿Confirmas que deseas cancelar esta sesión?')
    ) {
      return;
    }

    this.cancellationError.set(null);
    this.cancellingSessionId.set(session.id);
    this.sessionsService.cancelSession(session.id).subscribe({
      next: (cancelledSession) => {
        this.sessions.update((current) => current.map((item) => (
          item.id === cancelledSession.id ? cancelledSession : item
        )));
        this.cancellingSessionId.set(null);
      },
      error: (error: unknown) => {
        this.cancellationError.set(this.errors.getMessage(error));
        this.cancellingSessionId.set(null);
      }
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { laboratorioId, fecha, horaInicio, horaFin, materia, actividad } = this.form.getRawValue();
    if (fecha < this.today) {
      this.errorMessage.set('La fecha no puede estar en el pasado.');
      return;
    }

    const request: NuevaSesionLaboratorio = {
      laboratorioId,
      materia: materia.trim(),
      actividad: actividad.trim(),
      inicio: localDateTime(fecha, horaInicio),
      fin: localDateTime(fecha, horaFin)
    };
    if (!request.materia || !request.actividad || request.fin <= request.inicio) {
      this.errorMessage.set('Completa los datos y verifica que la hora de fin sea posterior a la de inicio.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.sessionsService.createSession(request).subscribe({
      next: (createdSession) => {
        this.sessions.update((sessions) => (
          [...sessions, createdSession].sort(
            (left, right) => Date.parse(left.inicio) - Date.parse(right.inicio)
          )
        ));
        this.form.reset({
          laboratorioId: '',
          fecha: '',
          horaInicio: '',
          horaFin: '',
          materia: '',
          actividad: ''
        });
        this.submitting.set(false);
        this.successMessage.set('Sesión creada correctamente.');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.sessionCreationError(error));
      }
    });
  }

  private sessionCreationError(error: unknown): string {
    const message = this.errors.getMessage(error);
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return `Revisa los datos de la sesión: ${message}`;
    }
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return `No se pudo crear la sesión por un conflicto de horario o disponibilidad: ${message}`;
    }
    return message;
  }
}