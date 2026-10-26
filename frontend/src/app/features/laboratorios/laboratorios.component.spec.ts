import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { LaboratoriosService, Laboratorio } from './laboratorios.service';
import { LaboratoriosComponent } from './laboratorios.component';
import { SesionesService, SesionEstudiante } from '../sesiones/sesiones.service';
import { ReservasService } from '../reservas/reservas.service';

describe('LaboratoriosComponent', () => {
  let fixture: ComponentFixture<LaboratoriosComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let laboratories: jasmine.SpyObj<LaboratoriosService>;
  let sessions: jasmine.SpyObj<SesionesService>;
  let reservations: jasmine.SpyObj<ReservasService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const activeLaboratory: Laboratorio = {
    id: 'lab-1',
    nombre: 'Laboratorio de Física',
    capacidad: 24,
    ubicacion: 'Bloque A, piso 2',
    ocupado: false
  };
  const availableSession: SesionEstudiante = {
    id: 'session-1',
    laboratorio: { id: 'lab-1', nombre: 'Laboratorio de Física', ubicacion: 'Bloque A' },
    docente: { id: 'teacher-1', correo: 'docente@utmachala.edu.ec' },
    materia: 'Física',
    actividad: 'Práctica de óptica',
    fecha: '2030-06-10T00:00:00.000Z',
    inicio: '2030-06-10T15:00:00.000Z',
    fin: '2030-06-10T16:00:00.000Z',
    capacidadMax: 20,
    inscritosCount: 8,
    estado: 'disponible'
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAdministrator', 'getRole']);
    auth.isAdministrator.and.returnValue(false);
    auth.getRole.and.returnValue('docente');
    laboratories = jasmine.createSpyObj<LaboratoriosService>(
      'LaboratoriosService',
      ['getActiveLaboratories']
    );
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);
    sessions = jasmine.createSpyObj<SesionesService>('SesionesService', ['getSchedule']);
    reservations = jasmine.createSpyObj<ReservasService>('ReservasService', ['createReservation']);
    sessions.getSchedule.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [LaboratoriosComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: LaboratoriosService, useValue: laboratories },
        { provide: SesionesService, useValue: sessions },
        { provide: ReservasService, useValue: reservations },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(LaboratoriosComponent);
    fixture.detectChanges();
  }

  it('renders each active laboratory name, capacity, and location', () => {
    laboratories.getActiveLaboratories.and.returnValue(of([activeLaboratory]));
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Laboratorio de Física');
    expect(page.textContent).toContain('24');
    expect(page.textContent).toContain('Bloque A, piso 2');
    expect(page.textContent).toContain('Disponible');
    expect(page.querySelector('[data-testid="laboratory-item"]')).not.toBeNull();
  });

  it('shows an occupied badge for a laboratory with a session in progress', () => {
    laboratories.getActiveLaboratories.and.returnValue(of([
      {
        ...activeLaboratory,
        ocupado: true,
        ocupadoHasta: new Date(Date.now() + 60_000).toISOString()
      }
    ]));
    createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ocupado / En Sesión');
  });

  it('treats an expired occupancy end as available', () => {
    laboratories.getActiveLaboratories.and.returnValue(of([{
      ...activeLaboratory,
      ocupado: true,
      ocupadoHasta: new Date(Date.now() - 1000).toISOString()
    }]));
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Disponible');
    expect(page.textContent).not.toContain('Ocupado / En Sesión');
  });

  it('refreshes laboratory status automatically', fakeAsync(() => {
    let requestCount = 0;
    laboratories.getActiveLaboratories.and.callFake(() => of(
      requestCount++ === 0
        ? [activeLaboratory]
        : [{ ...activeLaboratory, ocupado: true }]
    ));
    createComponent();

    tick(30_000);
    fixture.detectChanges();

    expect(laboratories.getActiveLaboratories).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ocupado / En Sesión');
    discardPeriodicTasks();
  }));

  it('shows an empty state when no active laboratories are available', () => {
    laboratories.getActiveLaboratories.and.returnValue(of([]));
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No hay laboratorios activos disponibles.'
    );
  });

  it('shows a safe message when the catalog request fails', () => {
    laboratories.getActiveLaboratories.and.returnValue(throwError(() => new Error('network failure')));
    errors.getMessage.and.returnValue('No se pudo cargar el catálogo.');
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo cargar el catálogo.'
    );
  });

  it('shows an administration link only to administrators', () => {
    laboratories.getActiveLaboratories.and.returnValue(of([activeLaboratory]));
    auth.isAdministrator.and.returnValue(true);
    createComponent();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/laboratorios/admin"]'))
      .not.toBeNull();
  });

  it('lists session details, free places and reserves after confirmation', () => {
    auth.getRole.and.returnValue('estudiante');
    sessions.getSchedule.and.returnValue(of([availableSession]));
    reservations.createReservation.and.returnValue(of({
      id: 'reservation-1',
      sesionLaboratorio: availableSession.id,
      usuario: 'student-1',
      estado: 'activa'
    }));
    spyOn(window, 'confirm').and.returnValue(true);
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Laboratorio de Física');
    expect(page.textContent).toContain('Bloque A');
    expect(page.textContent).toContain('Física');
    expect(page.textContent).toContain('Práctica de óptica');
    expect(page.textContent).toContain('docente@utmachala.edu.ec');
    expect(page.textContent).toContain('12/20');
    expect(page.textContent).toContain(fixture.componentInstance.formatDate(availableSession.inicio));
    expect(page.textContent).toContain('10:00');

    (page.querySelector('button.reserve-session') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(reservations.createReservation).toHaveBeenCalledWith({
      sesionLaboratorioId: availableSession.id
    });
    expect(page.textContent).toContain('Reserva realizada correctamente.');
    expect(page.textContent).toContain('11/20');
  });

  it('shows full sessions with reservation disabled', () => {
    auth.getRole.and.returnValue('estudiante');
    sessions.getSchedule.and.returnValue(of([{
      ...availableSession,
      inscritosCount: 20,
      estado: 'llena'
    }]));
    createComponent();

    const page = fixture.nativeElement as HTMLElement;
    const button = page.querySelector('button.reserve-session') as HTMLButtonElement;
    expect(page.textContent).toContain('Llena');
    expect(button.disabled).toBeTrue();
  });

  it('shows specific messages for full, duplicate and overlapping reservation conflicts', () => {
    auth.getRole.and.returnValue('estudiante');
    sessions.getSchedule.and.returnValue(of([availableSession]));
    spyOn(window, 'confirm').and.returnValue(true);
    const conflictCases = [
      ['LAB_SESSION_FULL', 'La sesión se llenó.'],
      ['RESERVATION_DUPLICATE', 'Ya reservaste un cupo para esta sesión.'],
      ['RESERVATION_TIME_CONFLICT', 'El horario se solapa con otra reserva tuya.']
    ];

    for (const [code, message] of conflictCases) {
      reservations.createReservation.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { error: { code } }
      })));
      createComponent();

      (fixture.nativeElement.querySelector('button.reserve-session') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(message);
      if (code === 'LAB_SESSION_FULL') {
        expect(fixture.nativeElement.textContent).toContain('Llena');
        expect(
          fixture.nativeElement.querySelector('button.reserve-session')?.disabled
        ).toBeTrue();
      }
      fixture.destroy();
    }
  });
});