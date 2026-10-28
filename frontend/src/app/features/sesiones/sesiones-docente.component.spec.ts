import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from '../laboratorios/laboratorios.service';
import { SesionLaboratorio, SesionesService } from './sesiones.service';
import { SesionesDocenteComponent } from './sesiones-docente.component';

describe('SesionesDocenteComponent', () => {
  let fixture: ComponentFixture<SesionesDocenteComponent>;
  let laboratories: jasmine.SpyObj<LaboratoriosService>;
  let sessions: jasmine.SpyObj<SesionesService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const laboratory: Laboratorio = {
    id: 'lab-1',
    nombre: 'Laboratorio de Física',
    capacidad: 24,
    ubicacion: 'Bloque A, piso 2'
  };
  const session: SesionLaboratorio = {
    id: 'session-1',
    laboratorio: { id: 'lab-1', nombre: 'Laboratorio de Física', ubicacion: 'Bloque A, piso 2' },
    docente: 'teacher-1',
    materia: 'Física',
    actividad: 'Práctica de óptica',
    fecha: '2030-01-02T00:00:00.000Z',
    inicio: '2030-01-02T15:00:00.000Z',
    fin: '2030-01-02T16:00:00.000Z',
    cupos: 24,
    inscritosCount: 3,
    estado: 'abierta'
  };

  beforeEach(async () => {
    laboratories = jasmine.createSpyObj<LaboratoriosService>(
      'LaboratoriosService',
      ['getActiveLaboratories']
    );
    laboratories.getActiveLaboratories.and.returnValue(of([laboratory]));
    sessions = jasmine.createSpyObj<SesionesService>(
      'SesionesService',
      ['getMySubjects', 'getMySessions', 'createSession', 'cancelSession']
    );
    sessions.getMySubjects.and.returnValue(of([
      { id: 'subject-1', nombre: 'Física', codigo: 'FIS-101', docente: 'teacher-1' }
    ]));
    sessions.getMySessions.and.returnValue(of([session]));
    sessions.createSession.and.returnValue(of(session));
    sessions.cancelSession.and.returnValue(of({ ...session, estado: 'cancelada' }));
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);
    errors.getMessage.and.returnValue('No se pudo completar la solicitud.');

    await TestBed.configureTestingModule({
      imports: [SesionesDocenteComponent],
      providers: [
        { provide: LaboratoriosService, useValue: laboratories },
        { provide: SesionesService, useValue: sessions },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SesionesDocenteComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  function futureDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  it('loads laboratories and the teacher subject list into selectors', () => {
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const laboratorySelect = page.querySelector('#laboratorio') as HTMLSelectElement;
    const subjectSelect = page.querySelector('#materia') as HTMLSelectElement;

    expect(laboratorySelect.textContent).toContain('24 puestos');
    expect(laboratorySelect.textContent).toContain('Bloque A, piso 2');
    expect(subjectSelect.textContent).toContain('Física · FIS-101');
  });

  it('shows required-field feedback after submitting an empty form', () => {
    fixture.detectChanges();
    fixture.componentInstance.submit();
    fixture.detectChanges();

    const alerts = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[role="alert"]')
    ).map((element) => element.textContent);
    expect(alerts).toContain('Selecciona un laboratorio.');
    expect(alerts).toContain('Selecciona una materia.');
    expect(alerts).toContain('Ingresa una actividad.');
    expect(sessions.createSession).not.toHaveBeenCalled();
  });

  it('creates a session with the selected laboratory and teacher subject', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue({
      laboratorioId: laboratory.id,
      fecha: futureDate(),
      horaInicio: '10:00',
      horaFin: '11:00',
      materia: 'Física',
      actividad: 'Práctica de óptica'
    });

    component.submit();

    expect(sessions.createSession).toHaveBeenCalledWith(jasmine.objectContaining({
      laboratorioId: laboratory.id,
      materia: 'Física',
      actividad: 'Práctica de óptica'
    }));
    expect(component.sessions().some(({ id }) => id === session.id)).toBeTrue();
    expect(component.successMessage()).toBe('Sesión creada correctamente.');
  });

  it('shows the server conflict message when the session overlaps', () => {
    fixture.detectChanges();
    errors.getMessage.and.returnValue('El laboratorio ya tiene una sesión programada en ese horario.');
    sessions.createSession.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { error: { message: 'El laboratorio ya tiene una sesión programada en ese horario.' } }
    })));
    fixture.componentInstance.form.setValue({
      laboratorioId: laboratory.id,
      fecha: futureDate(),
      horaInicio: '10:00',
      horaFin: '11:00',
      materia: 'Física',
      actividad: 'Práctica de óptica'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toContain('conflicto');
    expect(fixture.componentInstance.errorMessage()).toContain('ya tiene una sesión');
  });

  it('renders a finished session with a neutral status label', () => {
    fixture.detectChanges();
    fixture.componentInstance.sessions.set([{ ...session, estado: 'finalizada' }]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Finalizada');
    expect(Array.from(page.querySelectorAll('button')).some(
      (button) => button.textContent?.includes('Cancelar sesión')
    )).toBeFalse();
  });

  it('treats an expired open session as finished using the client clock', () => {
    fixture.detectChanges();
    const expired = { ...session, fin: new Date(Date.now() - 1000).toISOString() };
    fixture.componentInstance.sessions.set([expired]);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Finalizada');
    expect(Array.from(page.querySelectorAll('button')).some(
      (button) => button.textContent?.includes('Cancelar sesión')
    )).toBeFalse();
  });

  it('refreshes sessions and displays their finished state automatically', fakeAsync(() => {
    let requestCount = 0;
    sessions.getMySessions.and.callFake(() => of(
      requestCount++ === 0
        ? [session]
        : [{ ...session, estado: 'finalizada' }]
    ));
    fixture.detectChanges();

    tick(30_000);
    fixture.detectChanges();

    expect(sessions.getMySessions).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Finalizada');
    discardPeriodicTasks();
  }));

  it('shows validation feedback for an end time that is not after the start', () => {
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      laboratorioId: laboratory.id,
      fecha: futureDate(),
      horaInicio: '11:00',
      horaFin: '10:00',
      materia: 'Física',
      actividad: 'Práctica de óptica'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('La hora de fin debe ser posterior a la hora de inicio.');
    expect(sessions.createSession).not.toHaveBeenCalled();
  });

  it('rejects dates before today with visible feedback', () => {
    fixture.detectChanges();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0')
    ].join('-');
    fixture.componentInstance.form.setValue({
      laboratorioId: laboratory.id,
      fecha: pastDate,
      horaInicio: '10:00',
      horaFin: '11:00',
      materia: 'Física',
      actividad: 'Práctica de óptica'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('La fecha no puede estar en el pasado.');
    expect(sessions.createSession).not.toHaveBeenCalled();
  });

  it('shows the backend validation message for a 400 response', () => {
    fixture.detectChanges();
    errors.getMessage.and.returnValue('La actividad es obligatoria.');
    sessions.createSession.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { error: { message: 'La actividad es obligatoria.' } }
    })));
    fixture.componentInstance.form.setValue({
      laboratorioId: laboratory.id,
      fecha: futureDate(),
      horaInicio: '10:00',
      horaFin: '11:00',
      materia: 'Física',
      actividad: 'Práctica de óptica'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage())
      .toBe('Revisa los datos de la sesión: La actividad es obligatoria.');
  });

  it('cancels a session only after confirmation and updates its state', () => {
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.componentInstance.cancelSession(session);

    expect(sessions.cancelSession).toHaveBeenCalledWith(session.id);
    expect(fixture.componentInstance.sessions()[0].estado).toBe('cancelada');
  });

  it('does not cancel a session when confirmation is declined', () => {
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.cancelSession(session);

    expect(sessions.cancelSession).not.toHaveBeenCalled();
    expect(fixture.componentInstance.sessions()[0].estado).toBe('abierta');
  });

  it('shows a cancellation error without removing the session list', () => {
    fixture.detectChanges();
    errors.getMessage.and.returnValue('La sesión ya no se puede cancelar.');
    sessions.cancelSession.and.returnValue(throwError(() => new Error('conflict')));
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.cancelSession(session);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent)
      .toContain('La sesión ya no se puede cancelar.');
    expect(page.textContent).toContain('Mis sesiones');
    expect(fixture.componentInstance.sessions()[0].estado).toBe('abierta');
  });
});