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
    <main class="mx-auto min-h-screen max-w-7xl bg-gradient-to-br from-[#e8f2ef] via-[#f7f4ec] to-[#e9eeef] px-4 py-10 text-[#203a33] sm:px-6 lg:px-8">
      <header class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-wider text-emerald-800">Panel docente</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Sesiones de laboratorio</h1>
        <p class="mt-2 max-w-2xl text-slate-600">Programa una actividad y consulta el estado de las sesiones que has creado.</p>
      </header>

      <section class="mb-10 rounded-xl border border-[#cbd8d2] bg-white/90 p-5 shadow-sm sm:p-7" aria-labelledby="create-session-heading">
        <h2 id="create-session-heading" class="text-xl font-semibold">Crear una sesión</h2>
        @if (loadingLaboratories() || loadingSubjects()) {
          <p class="mt-4 text-sm text-slate-600" role="status">Cargando laboratorios y materias…</p>
        } @else if (laboratoryError()) {
          <p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{{ laboratoryError() }}</p>
        } @else if (subjectsError()) {
          <p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{{ subjectsError() }}</p>
        } @else if (laboratories().length === 0) {
          <p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No hay laboratorios activos disponibles.</p>
        } @else if (subjects().length === 0) {
          <p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No tienes materias asignadas para crear sesiones.</p>
        } @else {
          <form class="mt-5 grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label class="grid gap-1.5 text-sm font-medium sm:col-span-2" for="laboratorio">
              Laboratorio
              <select id="laboratorio" class="rounded-lg border border-[#aabbb4] bg-white px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" formControlName="laboratorioId">
                <option value="">Selecciona un laboratorio</option>
                @for (laboratory of laboratories(); track laboratory.id) {
                  <option [value]="laboratory.id">{{ laboratory.nombre }} · {{ laboratory.capacidad }} personas · {{ laboratory.ubicacion }}</option>
                }
              </select>
              @if (form.controls.laboratorioId.touched && form.controls.laboratorioId.invalid) {
                <span class="text-sm text-red-700" role="alert">Selecciona un laboratorio.</span>
              }
            </label>

            <label class="grid gap-1.5 text-sm font-medium" for="materia">
              Materia
              <select id="materia" class="rounded-lg border border-[#aabbb4] bg-white px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" formControlName="materia">
                <option value="">Selecciona una materia</option>
                @for (subject of subjects(); track subject.id) {
                  <option [value]="subject.nombre">{{ subject.nombre }} · {{ subject.codigo }}</option>
                }
              </select>
              @if (form.controls.materia.touched && form.controls.materia.invalid) {
                <span class="text-sm text-red-700" role="alert">Selecciona una materia.</span>
              }
            </label>

            <label class="grid gap-1.5 text-sm font-medium" for="actividad">
              Actividad
              <input id="actividad" class="rounded-lg border border-[#aabbb4] px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="text" formControlName="actividad" maxlength="200" />
              @if (form.controls.actividad.touched && form.controls.actividad.invalid) {
                <span class="text-sm text-red-700" role="alert">Ingresa una actividad.</span>
              }
            </label>

            <label class="grid gap-1.5 text-sm font-medium" for="fecha">
              Fecha
              <input id="fecha" class="rounded-lg border border-[#aabbb4] px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="date" [min]="today" formControlName="fecha" />
              @if (form.controls.fecha.touched && form.controls.fecha.hasError('required')) {
                <span class="text-sm text-red-700" role="alert">Selecciona una fecha.</span>
              } @else if (form.controls.fecha.touched && form.controls.fecha.hasError('pastDate')) {
                <span class="text-sm text-red-700" role="alert">La fecha no puede estar en el pasado.</span>
              }
            </label>

            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1.5 text-sm font-medium" for="horaInicio">
                Hora de inicio
                <input id="horaInicio" class="min-w-0 rounded-lg border border-[#aabbb4] px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="time" formControlName="horaInicio" />
                @if (form.controls.horaInicio.touched && form.controls.horaInicio.invalid) {
                  <span class="text-sm text-red-700" role="alert">Ingresa una hora de inicio.</span>
                }
              </label>
              <label class="grid gap-1.5 text-sm font-medium" for="horaFin">
                Hora de fin
                <input id="horaFin" class="min-w-0 rounded-lg border border-[#aabbb4] px-3 py-2.5 font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="time" formControlName="horaFin" />
                @if (form.controls.horaFin.touched && form.controls.horaFin.invalid) {
                  <span class="text-sm text-red-700" role="alert">Ingresa una hora de fin.</span>
                }
              </label>
            </div>

            @if (form.errors?.['invalidTimeRange'] && form.controls.horaInicio.touched && form.controls.horaFin.touched) {
              <p class="text-sm text-red-700 sm:col-span-2" role="alert">La hora de fin debe ser posterior a la hora de inicio.</p>
            }
            @if (form.errors?.['pastStart']) {
              <p class="text-sm text-red-700 sm:col-span-2" role="alert">La fecha y hora de inicio no pueden estar en el pasado.</p>
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
        @if (cancellationError()) {
          <p class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{{ cancellationError() }}</p>
        }
        @if (loadingSessions()) {
          <p class="rounded-lg bg-white p-5 text-sm text-slate-600" role="status">Cargando sesiones…</p>
        } @else if (sessionsError()) {
          <p class="rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{{ sessionsError() }}</p>
        } @else if (sessions().length === 0) {
          <p class="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Todavía no has creado sesiones.</p>
        } @else {
          <div class="grid gap-4 lg:grid-cols-2">
            @for (session of sessions(); track session.id) {
              @let status = effectiveSessionStatus(session);
              <article class="rounded-xl border border-[#cbd8d2] bg-white/90 p-5 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold">{{ session.materia }}</h3>
                    <p class="mt-1 text-sm text-slate-600">{{ session.actividad }}</p>
                  </div>
                  <span class="rounded-full px-3 py-1 text-xs font-semibold"
                    [class.bg-emerald-100]="status === 'abierta'"
                    [class.text-emerald-900]="status === 'abierta'"
                    [class.bg-amber-100]="status === 'llena'"
                    [class.text-amber-900]="status === 'llena'"
                    [class.bg-slate-200]="status === 'cancelada' || status === 'finalizada'"
                    [class.text-slate-700]="status === 'cancelada' || status === 'finalizada'">
                    {{ sessionStatusLabel(status) }}
                  </span>
                </div>
                <dl class="mt-4 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt class="font-medium text-slate-500">Laboratorio</dt><dd>{{ session.laboratorio.nombre }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Ubicación</dt><dd>{{ session.laboratorio.ubicacion }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Fecha</dt><dd>{{ session.inicio | date:'longDate' }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Horario</dt><dd>{{ session.inicio | date:'shortTime' }} – {{ session.fin | date:'shortTime' }}</dd></div>
                  <div><dt class="font-medium text-slate-500">Cupos</dt><dd>{{ session.inscritosCount }} / {{ session.cupos }}</dd></div>
                </dl>
                @if (status === 'abierta' || status === 'llena') {
                  <button
                    class="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                    type="button"
                    [disabled]="cancellingSessionId() === session.id"
                    (click)="cancelSession(session)"
                  >
                    {{ cancellingSessionId() === session.id ? 'Cancelando…' : 'Cancelar sesión' }}
                  </button>
                }
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      font-family: Georgia, 'Times New Roman', serif;
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
