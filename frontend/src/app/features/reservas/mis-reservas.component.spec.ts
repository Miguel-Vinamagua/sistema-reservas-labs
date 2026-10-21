import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { MisReservasComponent } from './mis-reservas.component';
import { ReservaPropia, ReservasService } from './reservas.service';

describe('MisReservasComponent', () => {
  let fixture: ComponentFixture<MisReservasComponent>;
  let reservations: jasmine.SpyObj<ReservasService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const activeReservation: ReservaPropia = {
    id: 'reservation-1',
    laboratorio: { id: 'lab-1', nombre: 'Laboratorio de Física', ubicacion: 'Bloque A' },
    inicio: '2030-06-10T15:00:00.000Z',
    fin: '2030-06-10T16:00:00.000Z',
    estado: 'activa'
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
      { ...activeReservation, id: 'reservation-2', estado: 'cancelada' }
    ]);

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Laboratorio de Física');
    expect(page.textContent).toContain('activa');
    expect(page.textContent).toContain('cancelada');
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
      laboratorio: activeReservation.laboratorio.id,
      usuario: 'user-1',
      inicio: activeReservation.inicio,
      fin: activeReservation.fin,
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