import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { LaboratoriosService } from '../laboratorios/laboratorios.service';
import { ReservaFormComponent } from './reserva-form.component';
import { ReservasService } from './reservas.service';

describe('ReservaFormComponent', () => {
  let fixture: ComponentFixture<ReservaFormComponent>;
  let laboratories: jasmine.SpyObj<LaboratoriosService>;
  let reservations: jasmine.SpyObj<ReservasService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  beforeEach(async () => {
    laboratories = jasmine.createSpyObj<LaboratoriosService>(
      'LaboratoriosService',
      ['getActiveLaboratories']
    );
    reservations = jasmine.createSpyObj<ReservasService>('ReservasService', ['createReservation']);
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);
    laboratories.getActiveLaboratories.and.returnValue(of([{
      id: 'lab-1',
      nombre: 'Laboratorio de Física',
      capacidad: 20,
      ubicacion: 'Bloque A'
    }]));

    await TestBed.configureTestingModule({
      imports: [ReservaFormComponent],
      providers: [
        { provide: LaboratoriosService, useValue: laboratories },
        { provide: ReservasService, useValue: reservations },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ReservaFormComponent);
    fixture.detectChanges();
  });

  it('validates that the end is after the start and sends the selected laboratory and ISO instants', () => {
    reservations.createReservation.and.returnValue(of({
      id: 'reservation-1',
      laboratorio: 'lab-1',
      usuario: 'user-1',
      inicio: '2030-06-10T15:00:00.000Z',
      fin: '2030-06-10T16:00:00.000Z',
      estado: 'activa'
    }));
    fixture.componentInstance.form.setValue({
      laboratorioId: 'lab-1',
      fecha: '2030-06-10',
      horaInicio: '10:00',
      horaFin: '11:00'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(reservations.createReservation).toHaveBeenCalledWith({
      laboratorioId: 'lab-1',
      inicio: new Date('2030-06-10T10:00').toISOString(),
      fin: new Date('2030-06-10T11:00').toISOString()
    });
    expect(fixture.nativeElement.textContent).toContain('Reserva creada correctamente.');
  });

  it('does not submit an invalid time range', () => {
    fixture.componentInstance.form.setValue({
      laboratorioId: 'lab-1',
      fecha: '2030-06-10',
      horaInicio: '11:00',
      horaFin: '10:00'
    });

    fixture.componentInstance.submit();

    expect(reservations.createReservation).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.errors).toEqual(jasmine.objectContaining({ invalidTimeRange: true }));
  });

  it('shows a safe message when reservation creation fails', () => {
    reservations.createReservation.and.returnValue(throwError(() => new Error('conflict')));
    errors.getMessage.and.returnValue('El laboratorio ya tiene una reserva en ese horario.');
    fixture.componentInstance.form.setValue({
      laboratorioId: 'lab-1',
      fecha: '2030-06-10',
      horaInicio: '10:00',
      horaFin: '11:00'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El laboratorio ya tiene una reserva en ese horario.');
  });
});