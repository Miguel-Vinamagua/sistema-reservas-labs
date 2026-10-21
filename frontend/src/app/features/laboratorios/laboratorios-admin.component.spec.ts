import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from './laboratorios.service';
import { LaboratoriosAdminComponent } from './laboratorios-admin.component';

describe('LaboratoriosAdminComponent', () => {
  let fixture: ComponentFixture<LaboratoriosAdminComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let laboratories: jasmine.SpyObj<LaboratoriosService>;
  let errors: jasmine.SpyObj<ErrorMessageService>;

  const laboratory: Laboratorio = {
    id: 'lab-1',
    nombre: 'Laboratorio de Física',
    capacidad: 24,
    ubicacion: 'Bloque A, piso 2',
    activo: true
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAdministrator']);
    auth.isAdministrator.and.returnValue(true);
    laboratories = jasmine.createSpyObj<LaboratoriosService>(
      'LaboratoriosService',
      ['getAllLaboratories', 'createLaboratory', 'updateLaboratory', 'deactivateLaboratory']
    );
    laboratories.getAllLaboratories.and.returnValue(of([laboratory]));
    errors = jasmine.createSpyObj<ErrorMessageService>('ErrorMessageService', ['getMessage']);

    await TestBed.configureTestingModule({
      imports: [LaboratoriosAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: LaboratoriosService, useValue: laboratories },
        { provide: ErrorMessageService, useValue: errors }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(LaboratoriosAdminComponent);
    fixture.detectChanges();
  });

  it('shows the administration view and existing laboratories to administrators', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Administrar laboratorios');
    expect(page.textContent).toContain('Laboratorio de Física');
    expect(page.querySelector('form')).not.toBeNull();
    expect(page.querySelector('a[href="/laboratorios"]')).not.toBeNull();
  });

  it('creates a laboratory with valid fields', () => {
    laboratories.createLaboratory.and.returnValue(of({ ...laboratory, id: 'lab-2', nombre: 'Lab nuevo' }));
    fixture.componentInstance.form.setValue({ nombre: 'Lab nuevo', capacidad: 18, ubicacion: 'Bloque C' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(laboratories.createLaboratory).toHaveBeenCalledWith({
      nombre: 'Lab nuevo',
      capacidad: 18,
      ubicacion: 'Bloque C'
    });
    expect(fixture.nativeElement.textContent).toContain('Lab nuevo');
  });

  it('rejects non-positive or fractional capacity and empty location', () => {
    fixture.componentInstance.form.setValue({ nombre: 'Lab nuevo', capacidad: 2.5, ubicacion: ' ' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.form.invalid).toBeTrue();
    expect(laboratories.createLaboratory).not.toHaveBeenCalled();
  });

  it('edits an existing laboratory', () => {
    laboratories.updateLaboratory.and.returnValue(of({
      ...laboratory,
      capacidad: 30,
      ubicacion: 'Bloque B'
    }));
    fixture.componentInstance.edit(laboratory);
    fixture.componentInstance.form.patchValue({ capacidad: 30, ubicacion: 'Bloque B' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(laboratories.updateLaboratory).toHaveBeenCalledWith('lab-1', {
      nombre: 'Laboratorio de Física',
      capacidad: 30,
      ubicacion: 'Bloque B'
    });
    expect(fixture.nativeElement.textContent).toContain('30');
  });

  it('deactivates a laboratory only after confirmation and preserves the item as inactive', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    laboratories.deactivateLaboratory.and.returnValue(of({ ...laboratory, activo: false }));

    fixture.componentInstance.deactivate(laboratory);
    fixture.detectChanges();

    expect(laboratories.deactivateLaboratory).toHaveBeenCalledWith('lab-1');
    expect(fixture.componentInstance.laboratories()[0].activo).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Inactivo');
  });

  it('shows an API error without discarding the laboratory list', () => {
    laboratories.createLaboratory.and.returnValue(throwError(() => new Error('forbidden')));
    errors.getMessage.and.returnValue('No se pudo crear el laboratorio.');
    fixture.componentInstance.form.setValue({ nombre: 'Lab nuevo', capacidad: 18, ubicacion: 'Bloque C' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo crear el laboratorio.');
    expect(fixture.nativeElement.textContent).toContain('Laboratorio de Física');
  });
});