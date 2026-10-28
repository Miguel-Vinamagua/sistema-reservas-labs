import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { SesionEstudiante, SesionesService } from './sesiones.service';
import { HorariosComponent } from './horarios.component';

describe('HorariosComponent', () => {
  let fixture: ComponentFixture<HorariosComponent>;
  let sessions: jasmine.SpyObj<SesionesService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  function createSession(id: string, inicio: string, fin: string): SesionEstudiante {
    return {
      id,
      laboratorio: { id: `lab-${id}`, nombre: `Laboratorio ${id}`, ubicacion: 'Bloque A' },
      docente: { id: 'teacher-1', correo: 'docente@utmachala.edu.ec' },
      materia: 'Física',
      actividad: 'Práctica de óptica',
      fecha: '2030-06-10T00:00:00.000Z',
      inicio,
      fin,
      capacidadMax: 20,
      inscritosCount: 4,
      estado: 'disponible'
    };
  }

  beforeEach(async () => {
    sessions = jasmine.createSpyObj<SesionesService>('SesionesService', ['getSchedule']);
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);
    sessions.getSchedule.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [HorariosComponent],
      providers: [
        { provide: SesionesService, useValue: sessions },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
  });

  afterEach(() => fixture?.destroy());

  function createComponent(): void {
    fixture = TestBed.createComponent(HorariosComponent);
    fixture.detectChanges();
  }

  it('shows the empty state when no scheduled sessions exist', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('No hay sesiones disponibles.');
  });

  it('renders session fields in chronological order and marks sessions in progress', () => {
    const now = Date.now();
    const inProgress = createSession(
      'current',
      new Date(now - 30 * 60_000).toISOString(),
      new Date(now + 30 * 60_000).toISOString()
    );
    const upcoming = createSession(
      'upcoming',
      new Date(now + 60 * 60_000).toISOString(),
      new Date(now + 2 * 60 * 60_000).toISOString()
    );
    sessions.getSchedule.and.returnValue(of([upcoming, inProgress]));
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    const rows = Array.from(page.querySelectorAll('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Laboratorio current');
    expect(rows[0].textContent).toContain('En curso');
    expect(rows[0].textContent).toContain(fixture.componentInstance.formatDate(inProgress.inicio));
    expect(rows[0].textContent).toContain('docente@utmachala.edu.ec');
    expect(rows[0].textContent).toContain('Práctica de óptica');
    expect(rows[0].textContent).toContain('4 / 20');
    expect(page.textContent).toContain('Ubicación');
    expect(page.textContent).toContain('Materia');
    expect(page.textContent).toContain('Fecha');
    expect(rows[1].textContent).toContain('Laboratorio upcoming');
  });

  it('formats instants in America/Guayaquil', () => {
    createComponent();

    expect(fixture.componentInstance.formatTime('2030-06-10T15:00:00.000Z')).toBe('10:00');
  });

  it('filters out sessions whose end time has passed even if returned by the API', () => {
    const expired = createSession(
      'expired',
      new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
      new Date(Date.now() - 60_000).toISOString()
    );
    sessions.getSchedule.and.returnValue(of([expired]));
    createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Laboratorio expired');
  });

  it('does not display cancelled sessions even if returned by the API', () => {
    const cancelled = {
      ...createSession(
        'cancelled',
        new Date(Date.now() + 60 * 60_000).toISOString(),
        new Date(Date.now() + 2 * 60 * 60_000).toISOString()
      ),
      estado: 'cancelada' as const
    };
    sessions.getSchedule.and.returnValue(of([cancelled]));
    createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Laboratorio cancelled');
  });

  it('refreshes the schedule every minute and removes sessions that have ended', fakeAsync(() => {
    const upcoming = createSession(
      'upcoming',
      new Date(Date.now() + 60 * 60_000).toISOString(),
      new Date(Date.now() + 2 * 60 * 60_000).toISOString()
    );
    let requestCount = 0;
    sessions.getSchedule.and.callFake(() => of(
      requestCount++ === 0 ? [upcoming] : []
    ));
    createComponent();

    tick(60_000);
    fixture.detectChanges();

    expect(sessions.getSchedule).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('No hay sesiones disponibles.');
    discardPeriodicTasks();
  }));

  it('refreshes the schedule when returning to the browser tab', () => {
    createComponent();
    spyOn(fixture.componentInstance, 'refresh');
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');

    document.dispatchEvent(new Event('visibilitychange'));

    expect(fixture.componentInstance.refresh).toHaveBeenCalled();
  });

  it('shows a clear error when loading the schedule fails', () => {
    sessions.getSchedule.and.returnValue(throwError(() => new Error('network failure')));
    errors.getMessage.and.returnValue('No se pudo cargar el horario.');
    createComponent();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudo cargar el horario.');
  });
});