import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SesionesService } from './sesiones.service';
import { environment } from '../../../environments/environment';

describe('SesionesService', () => {
  let service: SesionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SesionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the authenticated teacher subjects', () => {
    service.getMySubjects().subscribe((subjects) => {
      expect(subjects).toEqual([]);
    });

    http.expectOne(`${environment.apiBaseUrl}/materias`).flush({ data: [] });
  });

  it('requests the authenticated teacher sessions', () => {
    service.getMySessions().subscribe((sessions) => {
      expect(sessions).toEqual([]);
    });

    http.expectOne(`${environment.apiBaseUrl}/sesiones-laboratorio/mias`).flush({ data: [] });
  });

  it('requests available laboratory sessions for students', () => {
    const session = {
      id: 'session-1',
      laboratorio: { id: 'lab-1', nombre: 'Laboratorio A', ubicacion: 'Bloque A' },
      docente: { id: 'teacher-1', correo: 'docente@utmachala.edu.ec' },
      materia: 'Física',
      actividad: 'Práctica',
      fecha: '2030-01-01T00:00:00.000Z',
      inicio: '2030-01-01T15:00:00.000Z',
      fin: '2030-01-01T16:00:00.000Z',
      capacidadMax: 20,
      inscritosCount: 8,
      estado: 'disponible' as const
    };

    service.getAvailableSessions().subscribe((sessions) => {
      expect(sessions).toEqual([session]);
    });

    http.expectOne(`${environment.apiBaseUrl}/sesiones-laboratorio`).flush({ data: [session] });
  });

  it('requests scheduled sessions for the student timetable', () => {
    service.getSchedule().subscribe((sessions) => {
      expect(sessions).toEqual([]);
    });

    http.expectOne(`${environment.apiBaseUrl}/sesiones-laboratorio/horarios`).flush({ data: [] });
  });

  it('posts new sessions to the laboratory sessions endpoint', () => {
    const payload = {
      laboratorioId: 'lab-1',
      materia: 'Física',
      actividad: 'Práctica',
      inicio: '2030-01-01T15:00:00.000Z',
      fin: '2030-01-01T16:00:00.000Z'
    };

    service.createSession(payload).subscribe((session) => {
      expect(session.id).toBe('session-1');
    });

    const request = http.expectOne(`${environment.apiBaseUrl}/sesiones-laboratorio`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ data: { id: 'session-1' } });
  });

  it('cancels a session through the teacher endpoint', () => {
    service.cancelSession('session-1').subscribe((session) => {
      expect(session.estado).toBe('cancelada');
    });

    const request = http.expectOne(
      `${environment.apiBaseUrl}/sesiones-laboratorio/session-1/cancelar`
    );
    expect(request.request.method).toBe('PATCH');
    request.flush({ data: { id: 'session-1', estado: 'cancelada' } });
  });
});
