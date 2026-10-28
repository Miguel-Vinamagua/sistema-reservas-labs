import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReservaFormComponent } from './reserva-form.component';

describe('ReservaFormComponent legacy route', () => {
  let fixture: ComponentFixture<ReservaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaFormComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaFormComponent);
    fixture.detectChanges();
  });

  it('directs students to the Laboratorios tab to reserve an existing session', () => {
    const page = fixture.nativeElement as HTMLElement;

expect(page.textContent).toContain('La reserva de cupos se realiza de forma directa desde el catálogo general');    expect(page.querySelector('a[href="/laboratorios"]')).not.toBeNull();
  });

  it('does not display the obsolete laboratory and free-form time reservation fields', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('#laboratorio')).toBeNull();
    expect(page.querySelector('#fecha')).toBeNull();
    expect(page.querySelector('#horaInicio')).toBeNull();
    expect(page.querySelector('#horaFin')).toBeNull();
  });
});
