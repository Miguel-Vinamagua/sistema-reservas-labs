import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from './laboratorios.service';
import { SesionEstudiante, SesionesService } from '../sesiones/sesiones.service';
import { ReservasService } from '../reservas/reservas.service';

@Component({
  selector: 'app-laboratorios',
  imports: [RouterLink],
  template: `
    <main class="catalog-page">
      <header class="catalog-header">
        <p class="eyebrow">Espacios académicos</p>
        <h1>Laboratorios</h1>
        <p class="intro">
          {{ student
            ? 'Elige una sesión programada por un docente y reserva tu cupo.'
            : 'Consulta capacidad y ubicación antes de planear tu sesión.' }}
        </p>
        @if (administrator) {
          <a class="admin-link" routerLink="/laboratorios/admin">Administrar laboratorios</a>
        }
      </header>

      @if (student) {
        @if (loading()) {
          <p class="status" role="status">Cargando sesiones…</p>
        } @else if (errorMessage()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        } @else if (studentSessions().length === 0) {
          <p class="empty" data-testid="empty-state">No hay sesiones disponibles.</p>
        } @else {
          @if (successMessage()) {
            <p class="success" role="status">{{ successMessage() }}</p>
          }
          @if (reservationError()) {
            <p class="error" role="alert">{{ reservationError() }}</p>
          }
          <section class="catalog-list" aria-label="Sesiones de laboratorio">
            @for (session of studentSessions(); track session.id) {
              <article class="laboratory session-card" data-testid="session-item">
                <div class="laboratory-title">
                  <h2>{{ session.laboratorio.nombre }}</h2>
                  <span
                    class="availability"
                    [class.full]="isSessionFull(session)"
                  >{{ isSessionFull(session) ? 'Llena' : 'Disponible' }}</span>
                </div>
                <p class="location">Ubicación: {{ session.laboratorio.ubicacion }}</p>
                <dl class="session-details">
                  <div><dt>Materia</dt><dd>{{ session.materia }}</dd></div>
                  <div><dt>Docente</dt><dd>{{ session.docente.correo }}</dd></div>
                  <div><dt>Actividad</dt><dd>{{ session.actividad }}</dd></div>
                  <div><dt>Fecha</dt><dd>{{ formatDate(session.inicio) }}</dd></div>
                  <div><dt>Horario</dt><dd>{{ formatTime(session.inicio) }}–{{ formatTime(session.fin) }}</dd></div>
                  <div>
                  <dt>Cupos libres</dt>
                    <dd>{{ freePlaces(session) }}/{{ session.capacidadMax }}</dd>
                  </div>
                </dl>
                <button
  class="reserve-session"
  type="button"
  [disabled]="isSessionFull(session) || isReserved(session.id) || reservingSessionId() === session.id"
  (click)="reserve(session)"
>
  {{ isReserved(session.id) ? 'Reservado' : (reservingSessionId() === session.id ? 'Reservando…' : 'Reservar cupo') }}
</button>
              </article>
            }
          </section>
        }
      } @else {
        @if (loading()) {
          <p class="status" role="status">Cargando laboratorios…</p>
        } @else if (errorMessage()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        } @else if (laboratories().length === 0) {
          <p class="empty" data-testid="empty-state">No hay laboratorios activos disponibles.</p>
        } @else {
          <section class="catalog-list" aria-label="Laboratorios activos">
            @for (laboratory of laboratories(); track laboratory.id) {
              <article class="laboratory" data-testid="laboratory-item">
                <div class="laboratory-title">
                  <h2>{{ laboratory.nombre }}</h2>
                  <span class="capacity">{{ laboratory.capacidad }} personas</span>
                </div>
                <p class="location"><span aria-hidden="true">⌖</span> {{ laboratory.ubicacion }}</p>
                <span
                  class="availability"
                  [class.occupied]="isOccupied(laboratory)"
                  [attr.aria-label]="isOccupied(laboratory) ? 'Ocupado / En Sesión' : 'Disponible'"
                >
                  {{ isOccupied(laboratory) ? 'Ocupado / En Sesión' : 'Disponible' }}
                </span>
              </article>
            }
          </section>
        }
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .catalog-page {
      min-height: 100vh;
      box-sizing: border-box;
      padding: clamp(28px, 7vw, 76px) max(24px, calc((100vw - 1040px) / 2));
      background: #f1f5f2;
      color: #203a33;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .catalog-header { max-width: 660px; margin-bottom: 34px; }
    .eyebrow { margin: 0 0 12px; color: #467366; font: 700 12px/1.4 Arial, sans-serif; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 6vw, 56px); line-height: 1.05; }
    .intro { margin: 14px 0 0; color: #52635e; font: 16px/1.5 Arial, sans-serif; }
    .admin-link { display: inline-flex; min-height: 38px; align-items: center; margin-top: 16px; padding: 0 12px; border: 1px solid #aabbb4; border-radius: 4px; color: #315b4e; font: 700 12px Arial, sans-serif; text-decoration: none; }
    .catalog-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 12px; }
    .laboratory { min-width: 0; padding: 20px; border: 1px solid #d1ddd7; border-left: 4px solid #46806f; border-radius: 4px; background: #fff; }
    .laboratory-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    h2 { min-width: 0; margin: 0; font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; }
    .capacity { flex: 0 0 auto; padding: 5px 7px; border-radius: 3px; background: #e9f2ee; color: #315b4e; font: 700 12px/1.3 Arial, sans-serif; }
    .location { margin: 16px 0 0; color: #52635e; font: 14px/1.45 Arial, sans-serif; overflow-wrap: anywhere; }
    .location span { color: #467366; }
    .availability { display: inline-flex; margin-top: 14px; padding: 5px 9px; border-radius: 999px; background: #e9f2ee; color: #286455; font: 700 12px/1.3 Arial, sans-serif; }
    .availability.occupied { background: #fff1ee; color: #a12f28; }
    .availability.full { background: #edf0ef; color: #65716d; }
    .session-card { border-left-color: #46806f; }
    .session-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; margin: 18px 0 0; font: 14px/1.4 Arial, sans-serif; }
    .session-details dt { color: #65716d; font-size: 12px; font-weight: 700; }
    .session-details dd { margin: 3px 0 0; color: #203a33; overflow-wrap: anywhere; }
    .reserve-session { min-height: 42px; margin-top: 18px; padding: 0 16px; border: 0; border-radius: 4px; background: #286455; color: white; cursor: pointer; font: 700 13px Arial, sans-serif; }
    .reserve-session:disabled { cursor: not-allowed; opacity: .55; }
    .success { margin-bottom: 14px; padding: 12px; border-left: 3px solid #286455; background: #e9f2ee; color: #286455; font: 14px/1.45 Arial, sans-serif; }
    .status, .empty, .error { padding: 18px; border-radius: 4px; font: 15px/1.5 Arial, sans-serif; }
    .status, .empty { background: #fff; color: #52635e; }
    .error { border-left: 3px solid #a12f28; background: #fff1ee; color: #8b2924; }
  `
})
export class LaboratoriosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(LaboratoriosService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly administrator = this.auth.isAdministrator();
  readonly student = this.auth.getRole() === 'estudiante';
  readonly laboratories = signal<Laboratorio[]>([]);
  readonly studentSessions = signal<SesionEstudiante[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly reservationError = signal<string | null>(null);
  readonly reservingSessionId = signal<string | null>(null);
  readonly reservedSessionIds = signal<string[]>(
  JSON.parse(localStorage.getItem('user_reserved_sessions') || '[]')
);
  private readonly sessionsService = inject(SesionesService);
  private readonly reservationsService = inject(ReservasService);

  ngOnInit(): void {
    if (this.student) {
      this.loadStudentSessions();
      return;
    }

    this.loadLaboratories();
    interval(30_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadLaboratories(false));
  }

  reserve(session: SesionEstudiante): void {
    if (this.isSessionFull(session) || this.isReserved(session.id) || this.reservingSessionId() || !window.confirm(
      `¿Confirmas reservar un cupo para ${session.materia} en ${session.laboratorio.nombre}?`
    )) {
      return;
    }

    this.reservingSessionId.set(session.id);
    this.reservationError.set(null);
    this.successMessage.set(null);
    this.reservationsService.createReservation({
      sesionLaboratorioId: session.id
    }).subscribe({
      next: () => {
        // Marcar esta sesión como reservada localmente
        const updated = [...this.reservedSessionIds(), session.id];
        this.reservedSessionIds.set(updated);
        localStorage.setItem('user_reserved_sessions', JSON.stringify(updated));

        this.successMessage.set('Reserva realizada correctamente.');
        this.reservingSessionId.set(null);
      },
      error: (error: unknown) => {
        this.reservationError.set(this.reservationErrorMessage(error, session.id));
        this.reservingSessionId.set(null);
      }
    });
  }

  isSessionFull(session: SesionEstudiante): boolean {
    return session.estado === 'llena' || session.inscritosCount >= session.capacidadMax;
  }

  freePlaces(session: SesionEstudiante): number {
    return Math.max(0, session.capacidadMax - session.inscritosCount);
  }

  isReserved(sessionId: string): boolean {
  return this.reservedSessionIds().includes(sessionId);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeZone: 'America/Guayaquil'
    }).format(new Date(value));
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'America/Guayaquil'
    }).format(new Date(value));
  }

  isOccupied(laboratory: Laboratorio): boolean {
    if (!laboratory.ocupado) {
      return false;
    }

    if (!laboratory.ocupadoHasta) {
      return true;
    }

    return Date.now() <= Date.parse(laboratory.ocupadoHasta);
  }

  private loadLaboratories(initialLoad = true): void {
    if (initialLoad) {
      this.loading.set(true);
    }
    this.service.getActiveLaboratories().subscribe({
      next: (laboratories) => {
        this.laboratories.set(laboratories);
        this.errorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loading.set(false);
      }
    });
  }

  private loadStudentSessions(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.sessionsService.getSchedule().subscribe({
      next: (sessions) => {
        const now = Date.now();
        this.studentSessions.set(sessions.filter((session) =>
          session.fin && Date.parse(session.fin) > now &&
          (session.estado === 'abierta' || session.estado === 'disponible' || session.estado === 'llena')
        ));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loading.set(false);
      }
    });
  }

  private reservationErrorMessage(error: unknown, sessionId: string): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const payload = error.error as { error?: { code?: unknown } } | null;
      const code = payload?.error?.code;
      if (code === 'LAB_SESSION_FULL') {
        this.studentSessions.update((current) => current.map((session) => (
          session.id === sessionId
            ? { ...session, inscritosCount: session.capacidadMax, estado: 'llena' }
            : session
        )));
        return 'La sesión se llenó. Actualiza la lista para ver su estado.';
      }
      if (code === 'RESERVATION_DUPLICATE') {
        const updated = [...this.reservedSessionIds(), sessionId];
        this.reservedSessionIds.set(updated);
        localStorage.setItem('user_reserved_sessions', JSON.stringify(updated));
        return 'Ya tenías una reserva activa para esta sesión.';
      }
      if (code === 'RESERVATION_TIME_CONFLICT') {
        return 'El horario se solapa con otra reserva tuya.';
      }
      return this.errors.getMessage(error);
    }

    return this.errors.getMessage(error);
  }
}