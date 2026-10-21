import { Component, OnInit, inject, signal } from '@angular/core';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { ReservaPropia, ReservasService } from './reservas.service';

@Component({
  selector: 'app-mis-reservas',
  template: `
    <main class="reservations-page">
      <header class="page-header">
        <nav aria-label="Navegación de reservas">
          <a routerLink="/laboratorios">Laboratorios</a>
          <a routerLink="/reservas/nueva">Nueva reserva</a>
        </nav>
        <p class="eyebrow">Tu actividad</p>
        <h1>Mis Reservas</h1>
      </header>

      @if (loading()) {
        <p role="status">Cargando tus reservas…</p>
      } @else if (errorMessage()) {
        <p class="error" role="alert">{{ errorMessage() }}</p>
      } @else if (reservations().length === 0) {
        <p class="empty" data-testid="empty-state">No tienes reservas.</p>
      } @else {
        <section class="reservation-list" aria-label="Tus reservas">
          @for (reservation of reservations(); track reservation.id) {
            <article class="reservation-item">
              <div class="reservation-heading">
                <div>
                  <h2>{{ reservation.laboratorio.nombre }}</h2>
                  <p>{{ reservation.laboratorio.ubicacion }}</p>
                </div>
                <span class="state" [class.cancelled]="reservation.estado === 'cancelada'">
                  {{ reservation.estado }}
                </span>
              </div>
              <p class="schedule">
                {{ formatDate(reservation.inicio) }} · {{ formatTime(reservation.inicio) }}–{{ formatTime(reservation.fin) }}
              </p>
              @if (reservation.estado === 'activa') {
                <button
                  class="cancel-reservation"
                  type="button"
                  [disabled]="cancellingId() === reservation.id"
                  (click)="cancel(reservation)"
                >
                  {{ cancellingId() === reservation.id ? 'Cancelando…' : 'Cancelar reserva' }}
                </button>
              }
            </article>
          }
        </section>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .reservations-page { min-height: 100vh; box-sizing: border-box; padding: clamp(28px, 7vw, 72px) max(24px, calc((100vw - 960px) / 2)); background: #f1f5f2; color: #203a33; font-family: Georgia, 'Times New Roman', serif; }
    .page-header { margin-bottom: 32px; }
    nav { display: flex; flex-wrap: wrap; gap: 18px; }
    nav a { color: #286455; font: 700 13px Arial, sans-serif; text-decoration: none; }
    .eyebrow { margin: 26px 0 10px; color: #467366; font: 700 12px Arial, sans-serif; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 6vw, 52px); line-height: 1.05; }
    .reservation-list { display: grid; gap: 10px; }
    .reservation-item { padding: 20px; border: 1px solid #d1ddd7; border-radius: 4px; background: #fff; }
    .reservation-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
    h2 { margin: 0; font-size: 21px; overflow-wrap: anywhere; }
    .reservation-heading p, .schedule { margin: 7px 0 0; color: #52635e; font: 14px/1.45 Arial, sans-serif; }
    .state { flex: 0 0 auto; padding: 5px 8px; border-radius: 3px; background: #e9f2ee; color: #286455; font: 700 12px Arial, sans-serif; }
    .state.cancelled { background: #edf0ef; color: #65716d; }
    button { min-height: 38px; margin-top: 16px; padding: 0 14px; border: 1px solid #a23c32; border-radius: 4px; background: #fff; color: #8b2924; cursor: pointer; font: 700 13px Arial, sans-serif; }
    button:disabled { cursor: wait; opacity: .6; }
    .empty, .error { padding: 18px; border-radius: 4px; font: 15px/1.5 Arial, sans-serif; }
    .empty { background: #fff; color: #52635e; }
    .error { border-left: 3px solid #a12f28; background: #fff1ee; color: #8b2924; }
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

  cancel(reservation: ReservaPropia): void {
    if (reservation.estado !== 'activa' || !window.confirm('¿Cancelar esta reserva?')) {
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

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value));
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
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