import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { LaboratoriosService, Laboratorio } from './laboratorios.service';
import { LaboratoriosComponent } from './laboratorios.component';

describe('LaboratoriosComponent', () => {
  let fixture: ComponentFixture<LaboratoriosComponent>;
  let laboratories: jasmine.SpyObj<LaboratoriosService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const activeLaboratory: Laboratorio = {
    id: 'lab-1',
    nombre: 'Laboratorio de Física',
    capacidad: 24,
    ubicacion: 'Bloque A, piso 2'
  };

  beforeEach(async () => {
    laboratories = jasmine.createSpyObj<LaboratoriosService>(
      'LaboratoriosService',
      ['getActiveLaboratories']
    );
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);

    await TestBed.configureTestingModule({
      imports: [LaboratoriosComponent],
      providers: [
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
    expect(page.querySelector('[data-testid="laboratory-item"]')).not.toBeNull();
  });

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
});