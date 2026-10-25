import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { LaboratoriosService, Laboratorio } from './laboratorios.service';
import { LaboratoriosComponent } from './laboratorios.component';

describe('LaboratoriosComponent', () => {
  let fixture: ComponentFixture<LaboratoriosComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let laboratories: jasmine.SpyObj<LaboratoriosService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const activeLaboratory: Laboratorio = {
    id: 'lab-1',
    nombre: 'Laboratorio de Física',
    capacidad: 24,
    ubicacion: 'Bloque A, piso 2',
    ocupado: false
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAdministrator']);
    auth.isAdministrator.and.returnValue(false);
    laboratories = jasmine.createSpyObj<LaboratoriosService>(
      'LaboratoriosService',
      ['getActiveLaboratories']
    );
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);

    await TestBed.configureTestingModule({
      imports: [LaboratoriosComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: LaboratoriosService, useValue: laboratories },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
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
    laboratories.getActiveLaboratories.and.returnValues(
      of([activeLaboratory]),
      of([{ ...activeLaboratory, ocupado: true }])
    );
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
});