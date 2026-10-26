import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { SesionEstudiante, SesionesService } from './sesiones.service';

@Component({
  selector: 'app-horarios',
  standalone: true,
  template: `
    <main class="schedule-page">
      <header class="page-header">
        <p class="eyebrow">Agenda académica</p>
        <h1>Horarios</h1>
        <p>Sesiones en curso y próximas de todos los docentes.</p>
      </header>

      @if (loading()) {
        <p class="notice" role="status">Cargando horarios…</p>
      } @else if (errorMessage()) {
        <p class="error" role="alert">{{ errorMessage() }}</p>
      } @else if (visibleSessions().length === 0) {
        <p class="notice" data-testid="empty-state">No hay sesiones disponibles.</p>
      } @else {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Hora de inicio</th>
                <th scope="col">Hora de fin</th>
                <th scope="col">Laboratorio</th>
                <th scope="col">Ubicación</th>
                <th scope="col">Materia</th>
                <th scope="col">Docente</th>
                <th scope="col">Actividad</th>
                <th scope="col">Cupos</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (session of visibleSessions(); track session.id) {
                <tr>
                  <td>{{ formatDate(session.inicio) }}</td>
                  <td>{{ formatTime(session.inicio) }}</td>
                  <td>{{ formatTime(session.fin) }}</td>
                  <td>{{ session.laboratorio.nombre }}</td>
                  <td>{{ session.laboratorio.ubicacion }}</td>
                  <td>{{ session.materia }}</td>
                  <td>{{ session.docente.correo }}</td>
                  <td>{{ session.actividad }}</td>
                  <td>{{ session.inscritosCount }}/{{ session.capacidadMax }}</td>
                  <td>
                    <span
                      class="state"
                      [class.current]="statusLabel(session) === 'En curso'"
                      [class.full]="session.estado === 'llena'"
                    >{{ statusLabel(session) }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .schedule-page { min-height: 100vh; box-sizing: border-box; padding: clamp(28px, 6vw, 68px) max(20px, calc((100vw - 1280px) / 2)); background: #f1f5f2; color: #203a33; font-family: Georgia, 'Times New Roman', serif; }
    .page-header { margin-bottom: 30px; }
    .eyebrow { margin: 0 0 12px; color: #467366; font: 700 12px/1.4 Arial, sans-serif; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 6vw, 54px); line-height: 1.05; }
    .page-header > p:last-child { color: #52635e; font: 15px/1.5 Arial, sans-serif; }
    .table-container { overflow-x: auto; border: 1px solid #d1ddd7; border-radius: 4px; background: #fff; }
    table { width: 100%; min-width: 1040px; border-collapse: collapse; font: 13px/1.45 Arial, sans-serif; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #e2e9e5; text-align: left; vertical-align: top; }
    th { background: #e9f2ee; color: #315b4e; font-weight: 700; white-space: nowrap; }
    tbody tr:last-child td { border-bottom: 0; }
    .state { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: #e9f2ee; color: #286455; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .state.current { background: #d9eee5; color: #176348; }
    .state.full { background: #edf0ef; color: #65716d; }
    .notice, .error { padding: 18px; border-radius: 4px; font: 15px/1.5 Arial, sans-serif; }
    .notice { background: #fff; color: #52635e; }
    .error { border-left: 3px solid #a12f28; background: #fff1ee; color: #8b2924; }
  `
})
export class HorariosComponent implements OnInit {
  private readonly sessionsService = inject(SesionesService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sessions = signal<SesionEstudiante[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly now = signal(Date.now());

  ngOnInit(): void {
    this.refresh(true);
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.now.set(Date.now());
        this.refresh();
      });
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.now.set(Date.now());
      this.refresh();
    }
  }

  refresh(initialLoad = false): void {
    if (initialLoad) {
      this.loading.set(true);
    }

    this.sessionsService.getSchedule().subscribe({
      next: (sessions) => {
        const now = Date.now();
        this.now.set(now);
        this.sessions.set(sessions
          .filter((session) =>
            Date.parse(session.fin) > now &&
            session.estado !== 'cancelada' &&
            session.estado !== 'finalizada'
          )
          .sort((left, right) => Date.parse(left.inicio) - Date.parse(right.inicio)));
        this.errorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loading.set(false);
      }
    });
  }

  visibleSessions(): SesionEstudiante[] {
    const now = this.now();
    return this.sessions().filter((session) => Date.parse(session.fin) > now);
  }

  statusLabel(session: SesionEstudiante): string {
    const now = this.now();
    if (Date.parse(session.inicio) <= now && now < Date.parse(session.fin)) {
      return 'En curso';
    }

    return session.estado === 'llena' ? 'Llena' : 'Disponible';
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
}
