import { Component, OnInit, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { ReservaPropia, ReservasService } from './reservas.service';

@Component({
  selector: 'app-mis-reservas',
  imports: [TitleCasePipe],
  template: `
    <main class="reservations-page">
      <div class="reservations-container">
        <header class="page-header">
          <nav aria-label="Navegación de reservas"></nav>
          <span class="eyebrow">Gestión personal</span>
          <h1>Mis Reservas</h1>
          <p class="intro">Consulta el historial y el estado de tus espacios académicos reservados.</p>
        </header>

        @if (loading()) {
          <div class="state-container" role="status">
            <div class="spinner-pro"></div>
            <p class="status">Cargando tus reservas institucionales…</p>
          </div>
        } @else if (errorMessage()) {
          <div class="alert-box error" role="alert">
            <span class="alert-icon">⚠️</span>
            <p>{{ errorMessage() }}</p>
          </div>
        } @else if (reservations().length === 0) {
          <div class="empty-state" data-testid="empty-state">
            <div class="empty-icon">📭</div>
            <h3>Sin reservas registradas</h3>
            <p>Aún no has apartado ningún cupo en los laboratorios académicos.</p>
          </div>
        } @else {
          <section class="reservation-grid" aria-label="Tus reservas">
            @for (reservation of reservations(); track reservation.id) {
              <article class="pro-card reservation-item">
                <div class="reservation-heading">
                  <div>
                    <h2>{{ reservation.laboratorio?.nombre || 'Laboratorio' }}</h2>
                    @if (reservation.laboratorio?.ubicacion) {
                      <p class="location-text"><span class="loc-icon">📍</span> {{ reservation.laboratorio?.ubicacion }}</p>
                    }
                  </div>
                  <span
                    class="state-badge"
                    [class.cancelled]="reservation.estado === 'cancelada'"
                    [class.finished]="reservation.estado === 'finalizada'"
                    [class.active]="reservation.estado === 'activa'"
                  >
                    {{ reservation.estado | titlecase }}
                  </span>
                </div>

                <div class="reservation-details-box">
                  <div class="detail-row">
                    <span class="dt-label">Materia</span>
                    <span class="dd-value">{{ reservation.materia || 'No especificada' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="dt-label">Actividad</span>
                    <span class="dd-value">{{ reservation.actividad || 'No especificada' }}</span>
                  </div>
                  <div class="detail-row schedule-row">
                    <span class="dt-label">Horario programado</span>
                    <span class="dd-value schedule-text">
                      📅 {{ formatDate(reservation.inicio) }} &nbsp;•&nbsp; ⏰ {{ formatTime(reservation.inicio) }} – {{ formatTime(reservation.fin) }}
                    </span>
                  </div>
                </div>

                @if (reservation.estado === 'activa' && !isSessionStarted(reservation)) {
                  <button
                    class="btn-cancel"
                    type="button"
                    [disabled]="cancellingId() === reservation.id"
                    (click)="cancel(reservation)"
                  >
                    @if (cancellingId() === reservation.id) {
                      <span class="spinner-small"></span>
                      <span>Cancelando reserva…</span>
                    } @else {
                      <span>Cancelar reserva</span>
                    }
                  </button>
                }
              </article>
            }
          </section>
        }
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    
    .reservations-page { 
      min-height: 100vh; 
      box-sizing: border-box; 
      padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px); 
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
      color: #0f172a; 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    }

    .reservations-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header { 
      margin-bottom: 40px; 
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 24px;
    }

    nav { display: flex; flex-wrap: wrap; gap: 18px; }

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

    .reservation-grid { 
      display: grid; 
      gap: 20px; 
    }

    .pro-card { 
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px; 
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
      border-left: 4px solid #2563eb;
    }

    .pro-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      border-color: #94a3b8;
    }

    .reservation-heading { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      gap: 16px; 
    }

    h2 { 
      margin: 0; 
      font-size: 19px; 
      font-weight: 700;
      color: #0f172a;
      overflow-wrap: anywhere; 
    }

    .location-text {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 13.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .loc-icon {
      font-size: 12px;
    }

    .state-badge { 
      display: inline-flex; 
      padding: 4px 10px; 
      border-radius: 20px; 
      background: #ecfdf5; 
      color: #047857; 
      font-weight: 700;
      font-size: 11.5px; 
      letter-spacing: 0.02em;
    }

    .state-badge.cancelled, .state-badge.finished { 
      background: #f1f5f9; 
      color: #64748b; 
    }

    .reservation-details-box {
      margin: 18px 0;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .detail-row {
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
      color: #1e293b;
      font-size: 14px;
      font-weight: 500;
      overflow-wrap: anywhere;
    }

    .schedule-text {
      color: #2563eb;
      font-weight: 600;
    }

    .btn-cancel { 
      height: 42px; 
      width: 100%;
      margin-top: 4px; 
      padding: 0 16px; 
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
      margin-bottom: 20px; 
      padding: 14px 18px; 
      border-radius: 10px; 
      font-size: 14px; 
      font-weight: 500;
    }

    .alert-box p { margin: 0; }
    .alert-box.error { 
      border-left: 4px solid #dc2626; 
      background: #fef2f2; 
      color: #991b1b; 
    }

    .alert-icon { font-weight: bold; }

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

    .status { margin: 0; color: #64748b; font-size: 15px; font-weight: 500; }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 6px; font-size: 18px; color: #0f172a; }
    .empty-state p { margin: 0; color: #64748b; font-size: 14px; }

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
      border: 2px solid rgba(220, 38, 38, 0.3);
      border-radius: 50%;
      border-top-color: #dc2626;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `
})
export class MisReservasComponent implements OnInit {
  private readonly service = inject(ReservasService);
  private readonly errors = inject(ErrorMessageService);

  readonly reservations = signal<ReservaPropia[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly cancellingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReservations();
  }

  isSessionStarted(reservation: ReservaPropia): boolean {
    if (!reservation.inicio) {
      return false;
    }
    return Date.parse(reservation.inicio) <= Date.now();
  }

  cancel(reservation: ReservaPropia): void {
    if (reservation.estado !== 'activa' || this.isSessionStarted(reservation) || !window.confirm('¿Cancelar esta reserva?')) {
      return;
    }

    this.cancellingId.set(reservation.id);
    this.errorMessage.set(null);
    this.service.cancelReservation(reservation.id).subscribe({
      next: (cancelled) => {
        this.reservations.update((current) => current.map((item) => (
          item.id === cancelled.id ? { ...item, estado: 'cancelada' } : item
        )));
        this.cancellingId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.cancellingId.set(null);
      }
    });
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'Fecha no disponible';
    }

    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeZone: 'America/Guayaquil'
    }).format(new Date(value));
  }

  formatTime(value: string | null): string {
    if (!value) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'America/Guayaquil'
    }).format(new Date(value));
  }

  private loadReservations(): void {
    this.service.getMyReservations().subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loading.set(false);
      }
    });
  }
}