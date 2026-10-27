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
      <div class="catalog-container">
        <header class="catalog-header">
          <div class="header-titles">
            <span class="eyebrow">Gestión de Espacios Académicos</span>
            <h1>Laboratorios y Aulas</h1>
            <p class="intro">
              {{ student
                ? 'Selecciona una sesión programada por la facultad y asegura tu puesto en tiempo real.'
                : 'Consulta la capacidad, ubicación y disponibilidad operativa de los espacios.' }}
            </p>
          </div>
          @if (administrator) {
            <a class="admin-link" routerLink="/laboratorios/admin">
              <span>⚙️</span> Panel de Administración
            </a>
          }
        </header>

        @if (student) {
          @if (loading()) {
            <div class="state-container" role="status">
              <div class="spinner-pro"></div>
              <p class="status">Sincronizando sesiones disponibles…</p>
            </div>
          } @else if (errorMessage()) {
            <div class="alert-box error" role="alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ errorMessage() }}</p>
            </div>
          } @else if (studentSessions().length === 0) {
            <div class="empty-state" data-testid="empty-state">
              <div class="empty-icon">📅</div>
              <h3>Sin sesiones activas</h3>
              <p>No existen horarios de laboratorio habilitados para reserva en este momento.</p>
            </div>
          } @else {
            @if (successMessage()) {
              <div class="alert-box success" role="status">
                <span class="alert-icon">✓</span>
                <p>{{ successMessage() }}</p>
              </div>
            }
            @if (reservationError()) {
              <div class="alert-box error" role="alert">
                <span class="alert-icon">⚠️</span>
                <p>{{ reservationError() }}</p>
              </div>
            }
            <section class="catalog-grid" aria-label="Sesiones de laboratorio">
              @for (session of studentSessions(); track session.id) {
                <article class="pro-card session-card" data-testid="session-item">
                  <div class="card-top">
                    <h2>{{ session.laboratorio.nombre }}</h2>
                    <span
                      class="status-badge"
                      [class.full]="isSessionFull(session)"
                    >{{ isSessionFull(session) ? 'Cupo lleno' : 'Disponible' }}</span>
                  </div>
                  
                  <p class="location-text"><span class="loc-icon">📍</span> {{ session.laboratorio.ubicacion }}</p>
                  
                  <div class="session-details-grid">
                    <div class="detail-item"><span class="dt-label">Materia</span><span class="dd-value">{{ session.materia }}</span></div>
                    <div class="detail-item"><span class="dt-label">Docente</span><span class="dd-value">{{ session.docente.correo }}</span></div>
                    <div class="detail-item"><span class="dt-label">Actividad</span><span class="dd-value">{{ session.actividad }}</span></div>
                    <div class="detail-item"><span class="dt-label">Fecha</span><span class="dd-value">{{ formatDate(session.inicio) }}</span></div>
                    <div class="detail-item"><span class="dt-label">Horario</span><span class="dd-value">{{ formatTime(session.inicio) }} – {{ formatTime(session.fin) }}</span></div>
                    <div class="detail-item">
                      <span class="dt-label">Plazas libres</span>
                      <span class="dd-value highlight-badge">{{ freePlaces(session) }} / {{ session.capacidadMax }}</span>
                    </div>
                  </div>

                  <button
                    class="btn-action"
                    type="button"
                    [disabled]="isSessionFull(session) || isReserved(session.id) || reservingSessionId() === session.id"
                    (click)="reserve(session)"
                  >
                    @if (reservingSessionId() === session.id) {
                      <span class="spinner-small"></span>
                      <span>Procesando reserva…</span>
                    } @else if (isReserved(session.id)) {
                      <span>✓ Reservado con éxito</span>
                    } @else {
                      <span>Reservar cupo</span>
                    }
                  </button>
                </article>
              }
            </section>
          }
        } @else {
          @if (loading()) {
            <div class="state-container" role="status">
              <div class="spinner-pro"></div>
              <p class="status">Cargando infraestructura de laboratorios…</p>
            </div>
          } @else if (errorMessage()) {
            <div class="alert-box error" role="alert">
              <span class="alert-icon">⚠️</span>
              <p>{{ errorMessage() }}</p>
            </div>
          } @else if (laboratories().length === 0) {
            <div class="empty-state" data-testid="empty-state">
              <div class="empty-icon">🏛️</div>
              <h3>Infraestructura no disponible</h3>
              <p>No se registran laboratorios activos operativos actualmente.</p>
            </div>
          } @else {
            <section class="catalog-grid" aria-label="Laboratorios activos">
              @for (laboratory of laboratories(); track laboratory.id) {
                <article class="pro-card" data-testid="laboratory-item">
                  <div class="card-top">
                    <h2>{{ laboratory.nombre }}</h2>
                    <span class="capacity-badge">{{ laboratory.capacidad }} puestos</span>
                  </div>
                  <p class="location-text"><span class="loc-icon">📍</span> {{ laboratory.ubicacion }}</p>
                  
                  <div class="card-footer-info">
                    <span
                      class="status-badge"
                      [class.occupied]="isOccupied(laboratory)"
                      [attr.aria-label]="isOccupied(laboratory) ? 'Ocupado / En Sesión' : 'Disponible'"
                    >
                      {{ isOccupied(laboratory) ? 'Ocupado / En Sesión' : 'Disponible' }}
                    </span>
                  </div>
                </article>
              }
            </section>
          }
        }
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    
    .catalog-page {
      min-height: 100vh;
      box-sizing: border-box;
      padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .catalog-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .catalog-header { 
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      margin-bottom: 40px; 
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 24px;
    }

    .header-titles {
      max-width: 700px;
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
      line-height: 1.5; 
    }

    .admin-link { 
      display: inline-flex; 
      height: 42px; 
      align-items: center; 
      gap: 8px;
      padding: 0 16px; 
      border: 1.5px solid #cbd5e1; 
      border-radius: 8px; 
      color: #1e293b; 
      font-weight: 600;
      font-size: 13px; 
      text-decoration: none; 
      background: #ffffff;
      transition: all 0.2s ease;
    }

    .admin-link:hover {
      background: #0f172a;
      color: white;
      border-color: #0f172a;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      transform: translateY(-1px);
    }

    .catalog-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); 
      gap: 20px; 
    }

    .pro-card { 
      position: relative;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px; 
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    }

    .pro-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border-color: #94a3b8;
    }

    .session-card {
      border-top: 4px solid #2563eb;
    }

    .card-top { 
      display: flex; 
      align-items: flex-start; 
      justify-content: space-between; 
      gap: 12px; 
    }

    h2 { 
      margin: 0; 
      font-size: 19px; 
      font-weight: 700;
      line-height: 1.3; 
      color: #0f172a;
      overflow-wrap: anywhere; 
    }

    .capacity-badge { 
      flex: 0 0 auto; 
      padding: 4px 10px; 
      border-radius: 20px; 
      background: #f1f5f9; 
      color: #334155; 
      font-weight: 600;
      font-size: 12px; 
    }

    .location-text { 
      margin: 10px 0 16px; 
      color: #64748b; 
      font-size: 13.5px; 
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-wrap: anywhere; 
    }

    .loc-icon {
      font-size: 12px;
    }

    .status-badge { 
      display: inline-flex; 
      padding: 4px 10px; 
      border-radius: 20px; 
      background: #ecfdf5; 
      color: #047857; 
      font-weight: 700;
      font-size: 11.5px; 
      letter-spacing: 0.02em;
    }

    .status-badge.occupied { 
      background: #fef2f2; 
      color: #dc2626; 
    }

    .status-badge.full { 
      background: #f1f5f9; 
      color: #64748b; 
    }

    .card-footer-info {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
    }

    .session-details-grid { 
      display: grid; 
      grid-template-columns: repeat(2, minmax(0, 1fr)); 
      gap: 12px 16px; 
      margin: 14px 0 20px; 
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

    .dt-label { 
      color: #64748b; 
      font-size: 11px; 
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .dd-value { 
      margin: 0; 
      color: #1e293b; 
      font-size: 13.5px; 
      font-weight: 500;
      overflow-wrap: anywhere; 
    }

    .highlight-badge {
      font-weight: 700;
      color: #2563eb;
    }

    .btn-action { 
      height: 44px; 
      width: 100%;
      margin-top: auto; 
      padding: 0 16px; 
      border: 0; 
      border-radius: 8px; 
      background: #2563eb; 
      color: white; 
      cursor: pointer; 
      font-weight: 600;
      font-size: 13.5px; 
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }

    .btn-action:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
      transform: translateY(-1px);
    }

    .btn-action:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-action:disabled { 
      cursor: not-allowed; 
      opacity: 0.55; 
      box-shadow: none;
    }

    /* Alertas y estados mejorados */
    .alert-box { 
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px; 
      padding: 14px 18px; 
      border-radius: 10px; 
      font-size: 14px; 
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }

    .alert-box p {
      margin: 0;
    }

    .alert-box.success { 
      border-left: 4px solid #059669; 
      background: #ecfdf5; 
      color: #065f46; 
    }

    .alert-box.error { 
      border-left: 4px solid #dc2626; 
      background: #fef2f2; 
      color: #991b1b; 
    }

    .alert-icon {
      font-size: 16px;
      font-weight: bold;
    }

    .state-container, .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
    }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .status {
      margin: 0;
      color: #64748b;
      font-size: 15px;
      font-weight: 500;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .empty-state h3 {
      margin: 0 0 6px;
      font-size: 18px;
      color: #0f172a;
    }

    .empty-state p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }

    /* Spinners elegantes */
    .spinner-pro {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(37, 99, 235, 0.15);
      border-radius: 50%;
      border-top-color: #2563eb;
      animation: spin 0.7s linear infinite;
    }

    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .catalog-grid {
        grid-template-columns: 1fr;
      }
      .catalog-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
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