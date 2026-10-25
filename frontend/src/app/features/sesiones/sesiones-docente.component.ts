import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from '../laboratorios/laboratorios.service';
import {
  NuevaSesionLaboratorio,
  SesionLaboratorio,
  SesionesService
} from './sesiones.service';

function sessionTimeRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('horaInicio')?.value as string | null;
  const end = control.get('horaFin')?.value as string | null;
  return start && end && end <= start ? { invalidTimeRange: true } : null;
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
    <main class="mx-auto min-h-screen max-w-7xl bg-slate-50 px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
      <header class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-wider text-emerald-800">Panel docente</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Sesiones de laboratorio</h1>
        <p class="mt-2 max-w-2xl text-slate-600">Programa una actividad y consulta el estado de las sesiones que has creado.</p>
      </header>

      <section class="mb-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="create-session-heading">
        <h2 id="create-session-heading" class="text-xl font-semibold">Crear una sesión</h2>
        @if (loadingLaboratories()) {
          <p class="mt-4 text-sm text-slate-600" role="status">Cargando laboratorios…</p>
        } @else if (laboratoryError()) {
          <p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{{ laboratoryError() }}</p>
        } @else if (laboratories().length === 0) {
          <p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No hay laboratorios activos disponibles.</p>
        } @else {
          <form class="mt-5 grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label class="grid gap-1.5 text-sm font-medium sm:col-span-2" for="laboratorio">
              Laboratorio
              <select id="laboratorio" class="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" formControlName="laboratorioId">
                <option value="">Selecciona un laboratorio</option>
                @for (laboratory of laboratories(); track laboratory.id) {
                  <option [value]="laboratory.id">{{ laboratory.nombre }} · {{ laboratory.capacidad }} personas</option>
                }
              </select>
            </label>

            <label class="grid gap-1.5 text-sm font-medium" for="materia">
              Materia
              <input id="materia" class="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="text" formControlName="materia" maxlength="120" />
            </label>

            <label class="grid gap-1.5 text-sm font-medium" for="actividad">
              Actividad
              <input id="actividad" class="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="text" formControlName="actividad" maxlength="200" />
            </label>

            <label class="grid gap-1.5 text-sm font-medium" for="fecha">
              Fecha
              <input id="fecha" class="rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="date" [min]="today" formControlName="fecha" />
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1.5 text-sm font-medium" for="horaInicio">
                Hora de inicio
                <input id="horaInicio" class="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="time" formControlName="horaInicio" />
              </label>
              <label class="grid gap-1.5 text-sm font-medium" for="horaFin">
                Hora de fin
                <input id="horaFin" class="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="time" formControlName="horaFin" />
              </label>
            </div>

            @if (form.errors?.['invalidTimeRange']) {
              <p class="text-sm text-red-700 sm:col-span-2" role="alert">La hora de fin debe ser posterior a la hora de inicio.</p>
            }
            @if (errorMessage()) {
              <p class="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2" role="alert">{{ errorMessage() }}</p>
            }
            @if (successMessage()) {
              <p class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 sm:col-span-2" role="status">{{ successMessage() }}</p>
            }
            <button class="min-h-11 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 sm:justify-self-start" type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Creando sesión…' : 'Crear sesión' }}
            </button>
          </form>
        }
      </section>

      <section aria-labelledby="my-sessions-heading">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-sessions-heading" class="text-xl font-semibold">Mis sesiones</h2>
          <button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50" type="button" [disabled]="loadingSessions()" (click)="loadSessions()">Actualizar</button>
        </div>
        @if (loadingSessions()) {
          <p class="rounded-lg bg-white p-5 text-sm text-slate-600" role="status">Cargando sesiones…</p>
        } @else if (sessionsError()) {
          <p class="rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{{ sessionsError() }}</p>
        } @else if (sessions().length === 0) {
          <p class="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Todavía no has creado sesiones.</p>
        } @else {
          <div class="grid gap-4 lg:grid-cols-2">
            @for (session of sessions(); track session.id) {
              <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold">{{ session.materia }}</h3>
                    <p class="mt-1 text-sm text-slate-600">{{ session.actividad }}</p>
                  </div>
                  <span class="rounded-full px-3 py-1 text-xs font-semibold"
                    [class.bg-emerald-100]="session.estado === 'disponible'"
                    [class.text-emerald-900]="session.estado === 'disponible'"
                    [class.bg-amber-100]="session.estado === 'llena'"
                    [class.text-amber-900]="session.estado === 'llena'"
                    [class.bg-slate-200]="session.estado === 'finalizada'"
                    [class.text-slate-700]="session.estado === 'finalizada'">
                    {{ session.estado }}
                  </span>
                </div>
                <dl class="mt-4 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt class="font-medium text-slate-500">Laboratorio</dt><dd>{{ session.laboratorio.nombre }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Ubicación</dt><dd>{{ session.laboratorio.ubicacion }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Horario</dt><dd>{{ session.inicio | date:'medium' }} – {{ session.fin | date:'shortTime' }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Inscritos</dt><dd>{{ session.inscritosCount }} / {{ session.capacidadMax }}</dd></div>
                </dl>
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
})
export class SesionesDocenteComponent implements OnInit {
  private readonly laboratoriesService = inject(LaboratoriosService);
  private readonly sessionsService = inject(SesionesService);
  private readonly errors = inject(ErrorMessageService);

  readonly laboratories = signal<Laboratorio[]>([]);
  readonly sessions = signal<SesionLaboratorio[]>([]);
  readonly loadingLaboratories = signal(true);
  readonly loadingSessions = signal(true);
  readonly submitting = signal(false);
  readonly laboratoryError = signal<string | null>(null);
  readonly sessionsError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly today = localDateString(new Date());

  readonly form = new FormGroup({
    laboratorioId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    materia: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    actividad: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] })
  }, { validators: [sessionTimeRangeValidator] });

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
    this.loadSessions();
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
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

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { laboratorioId, fecha, horaInicio, horaFin, materia, actividad } = this.form.getRawValue();
    if (fecha < this.today) {
      this.errorMessage.set('No se pueden crear sesiones en fechas pasadas.');
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
        this.errorMessage.set(this.errors.getMessage(error));
      }
    });
  }
}
