import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { MisReservasComponent } from './mis-reservas.component';
import { ReservaPropia, ReservasService } from './reservas.service';
import { environment } from '../../../environments/environment';

describe('MisReservasComponent', () => {
  let fixture: ComponentFixture<MisReservasComponent>;
  let reservations: jasmine.SpyObj<ReservasService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const activeReservation: ReservaPropia = {
    id: 'reservation-1',
    sesionLaboratorio: 'session-1',
    laboratorio: { id: 'lab-1', nombre: 'Laboratorio de Física', ubicacion: 'Bloque A' },
    docente: { id: 'teacher-1', correo: 'docente@utmachala.edu.ec' },
    materia: 'Física',
    actividad: 'Práctica de óptica',
    fecha: '2030-06-10T00:00:00.000Z',
    inicio: '2030-06-10T15:00:00.000Z',
    fin: '2030-06-10T16:00:00.000Z',
    capacidadMax: 20,
    inscritosCount: 4,
    estado: 'activa' as const
  };

  beforeEach(async () => {
    reservations = jasmine.createSpyObj<ReservasService>(
      'ReservasService',
      ['getMyReservations', 'cancelReservation']
    );
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);

    await TestBed.configureTestingModule({
      imports: [MisReservasComponent],
      providers: [
        { provide: ReservasService, useValue: reservations },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
  });

  function createComponent(initialReservations: ReservaPropia[]): void {
    reservations.getMyReservations.and.returnValue(of(initialReservations));
    fixture = TestBed.createComponent(MisReservasComponent);
    fixture.detectChanges();
  }

  it('shows the user reservations and an action only for active entries', () => {
    createComponent([
      activeReservation,
      { ...activeReservation, id: 'reservation-2', estado: 'cancelada' },
      { ...activeReservation, id: 'reservation-3', estado: 'finalizada' }
    ]);

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Laboratorio de Física');
    expect(page.textContent).toContain('Física');
    expect(page.textContent).toContain('Práctica de óptica');
    expect(page.textContent).toContain(fixture.componentInstance.formatDate(activeReservation.inicio));
    expect(page.textContent).toContain('Activa');
    expect(page.textContent).toContain('Cancelada');
    expect(page.textContent).toContain('Finalizada');
    expect(fixture.componentInstance.formatTime(activeReservation.inicio)).toBe('10:00');
    expect(page.querySelectorAll('button.cancel-reservation').length).toBe(1);
  });

  it('shows an empty state when the user has no reservations', () => {
    createComponent([]);

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'No tienes reservas.'
    );
  });

  it('asks for confirmation and updates an owned reservation to cancelled', () => {
    createComponent([activeReservation]);
    spyOn(window, 'confirm').and.returnValue(true);
    reservations.cancelReservation.and.returnValue(of({
      id: activeReservation.id,
      sesionLaboratorio: activeReservation.sesionLaboratorio!,
      usuario: 'user-1',
      estado: 'cancelada'
    }));

    fixture.componentInstance.cancel(activeReservation);
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(reservations.cancelReservation).toHaveBeenCalledWith(activeReservation.id);
    expect(fixture.componentInstance.reservations()[0].estado).toBe('cancelada');
    expect(fixture.nativeElement.querySelector('button.cancel-reservation')).toBeNull();
  });

  it('does not cancel when the user declines confirmation', () => {
    createComponent([activeReservation]);
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.cancel(activeReservation);

    expect(reservations.cancelReservation).not.toHaveBeenCalled();
    expect(fixture.componentInstance.reservations()[0].estado).toBe('activa');
  });
});

describe('ReservasService student session contract', () => {
  let service: ReservasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReservasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the authenticated student reservation history', () => {
    const reservation = {
      id: 'reservation-1',
      sesionLaboratorio: 'session-1',
      laboratorio: { id: 'lab-1', nombre: 'Laboratorio A', ubicacion: 'Bloque A' },
      docente: { id: 'teacher-1', correo: 'docente@utmachala.edu.ec' },
      materia: 'Física',
      actividad: 'Práctica',
      fecha: '2030-06-10T00:00:00.000Z',
      inicio: '2030-06-10T15:00:00.000Z',
      fin: '2030-06-10T16:00:00.000Z',
      capacidadMax: 20,
      inscritosCount: 4,
      estado: 'activa' as const
    };

    service.getMyReservations().subscribe((reservations) => {
      expect(reservations).toEqual([reservation]);
    });

    const request = http.expectOne(`${environment.apiBaseUrl}/reservas`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: [reservation] });
  });

  it('posts a reservation using only the selected laboratory session id', () => {
    const payload = { sesionLaboratorioId: 'session-1' };

    service.createReservation(payload).subscribe((reservation) => {
      expect(reservation.sesionLaboratorio).toBe('session-1');
      expect(reservation.estado).toBe('activa');
    });

    const request = http.expectOne(`${environment.apiBaseUrl}/reservas`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      data: {
        id: 'reservation-1',
        sesionLaboratorio: 'session-1',
        usuario: 'student-1',
        estado: 'activa'
      }
    });
  });

  it('cancels a reservation through its own cancellation endpoint', () => {
    service.cancelReservation('reservation-1').subscribe((reservation) => {
      expect(reservation.estado).toBe('cancelada');
    });

    const request = http.expectOne(`${environment.apiBaseUrl}/reservas/reservation-1/cancelar`);
    expect(request.request.method).toBe('PATCH');
    request.flush({
      data: {
        id: 'reservation-1',
        sesionLaboratorio: 'session-1',
        usuario: 'student-1',
        estado: 'cancelada'
      }
    });
  });
});