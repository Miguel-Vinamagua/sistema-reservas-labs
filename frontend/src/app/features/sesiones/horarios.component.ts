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
      <div class="schedule-container">
        <header class="page-header">
          <span class="eyebrow">Agenda académica</span>
          <h1>Horarios</h1>
          <p class="intro">Sesiones en curso y próximas programadas en la infraestructura institucional.</p>
        </header>

        @if (loading()) {
          <div class="state-container" role="status">
            <div class="spinner-pro"></div>
            <p class="status">Sincronizando horarios institucionales…</p>
          </div>
        } @else if (errorMessage()) {
          <div class="alert-box error" role="alert">
            <span class="alert-icon">⚠️</span>
            <p>{{ errorMessage() }}</p>
          </div>
        } @else if (visibleSessions().length === 0) {
          <div class="empty-state" data-testid="empty-state">
            <div class="empty-icon">📅</div>
            <h3>Sin sesiones activas</h3>
            <p>No hay horarios ni sesiones registradas para mostrar en este momento.</p>
          </div>
        } @else {
          <div class="table-container-pro">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Hora inicio</th>
                  <th scope="col">Hora fin</th>
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
                    <td class="fw-medium">{{ formatDate(session.inicio) }}</td>
                    <td>{{ formatTime(session.inicio) }}</td>
                    <td>{{ formatTime(session.fin) }}</td>
                    <td class="fw-bold text-dark">{{ session.laboratorio.nombre }}</td>
                    <td>{{ session.laboratorio.ubicacion }}</td>
                    <td>{{ session.materia }}</td>
                    <td class="text-muted">{{ session.docente.correo }}</td>
                    <td>{{ session.actividad }}</td>
                    <td><span class="badge-count">{{ session.inscritosCount }} / {{ session.capacidadMax }}</span></td>
                    <td>
                      <span
                        class="state-badge-table"
                        [class.current]="statusLabel(session) === 'En curso'"
                        [class.full]="session.estado === 'llena'"
                        [class.open]="statusLabel(session) === 'Disponible'"
                      >{{ statusLabel(session) }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    
    .schedule-page { 
      min-height: 100vh; 
      box-sizing: border-box; 
      padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px); 
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
      color: #0f172a; 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    }

    .schedule-container {
      max-width: 1300px;
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

    .table-container-pro { 
      overflow-x: auto; 
      border: 1px solid #e2e8f0; 
      border-radius: 14px; 
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
    }

    table { 
      width: 100%; 
      min-width: 1080px; 
      border-collapse: collapse; 
      font-size: 13.5px;
      line-height: 1.5;
    }

    th, td { 
      padding: 16px 18px; 
      border-bottom: 1px solid #f1f5f9; 
      text-align: left; 
      vertical-align: middle; 
    }

    th { 
      background: #f8fafc; 
      color: #334155; 
      font-weight: 700; 
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap; 
      border-bottom: 2px solid #e2e8f0;
    }

    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: #fafdfc; }

    .fw-medium { font-weight: 500; }
    .fw-bold { font-weight: 600; color: #0f172a; }
    .text-muted { color: #64748b; }

    .badge-count {
      display: inline-block;
      padding: 3px 8px;
      background: #f1f5f9;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      color: #334155;
    }

    .state-badge-table { 
      display: inline-flex; 
      padding: 4px 10px; 
      border-radius: 20px; 
      background: #ecfdf5; 
      color: #047857; 
      font-size: 11.5px; 
      font-weight: 700; 
      white-space: nowrap; 
      letter-spacing: 0.02em;
    }

    .state-badge-table.current { background: #eff6ff; color: #1d4ed8; }
    .state-badge-table.full { background: #fef3c7; color: #b45309; }
    .state-badge-table.open { background: #ecfdf5; color: #047857; }

    .alert-box { 
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
    }

    .alert-box p { margin: 0; }
    .alert-box.error { border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; }
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
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