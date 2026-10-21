import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from '../laboratorios/laboratorios.service';
import { NuevaReserva, ReservasService } from './reservas.service';

function timeRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('horaInicio')?.value as string | null;
  const end = control.get('horaFin')?.value as string | null;
  return start && end && end <= start ? { invalidTimeRange: true } : null;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-reserva-form',
  imports: [ReactiveFormsModule],
  template: `
    <main class="reservation-page">
      <header class="page-header">
        <a routerLink="/laboratorios">← Laboratorios</a>
        <p class="eyebrow">Nueva solicitud</p>
        <h1>Reservar un laboratorio</h1>
        <p>Elige un espacio y un horario para tu actividad.</p>
      </header>

      @if (loadingLaboratories()) {
        <p role="status">Cargando laboratorios…</p>
      } @else if (laboratories().length === 0) {
        <p class="notice">No hay laboratorios activos disponibles.</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="laboratorio">Laboratorio</label>
          <select id="laboratorio" formControlName="laboratorioId" required>
            <option value="">Selecciona un laboratorio</option>
            @for (laboratory of laboratories(); track laboratory.id) {
              <option [value]="laboratory.id">{{ laboratory.nombre }} · {{ laboratory.capacidad }} personas</option>
            }
          </select>

          <label for="fecha">Fecha</label>
          <input id="fecha" type="date" [min]="today" formControlName="fecha" required />

          <div class="time-fields">
            <div>
              <label for="horaInicio">Hora de inicio</label>
              <input id="horaInicio" type="time" formControlName="horaInicio" required />
            </div>
            <div>
              <label for="horaFin">Hora de fin</label>
              <input id="horaFin" type="time" formControlName="horaFin" required />
            </div>
          </div>

          @if (form.errors?.['invalidTimeRange']) {
            <p class="field-error" role="alert">La hora de fin debe ser posterior a la hora de inicio.</p>
          }
          @if (errorMessage()) {
            <p class="form-error" role="alert">{{ errorMessage() }}</p>
          }
          @if (successMessage()) {
            <p class="success" role="status">{{ successMessage() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Enviando…' : 'Confirmar reserva' }}
          </button>
        </form>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .reservation-page { min-height: 100vh; box-sizing: border-box; padding: clamp(28px, 7vw, 72px) 24px; background: #f1f5f2; color: #203a33; font-family: Georgia, 'Times New Roman', serif; }
    .page-header, form { width: min(100%, 620px); margin-inline: auto; }
    .page-header { margin-bottom: 28px; }
    .page-header a { color: #286455; font: 700 13px Arial, sans-serif; text-decoration: none; }
    .eyebrow { margin: 26px 0 10px; color: #467366; font: 700 12px Arial, sans-serif; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(32px, 6vw, 50px); line-height: 1.05; }
    .page-header > p:last-child { color: #52635e; font: 15px/1.5 Arial, sans-serif; }
    form { display: grid; gap: 10px; padding: 24px; border: 1px solid #d1ddd7; border-radius: 5px; background: #fff; }
    label { margin-top: 8px; font: 700 13px Arial, sans-serif; }
    input, select { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #aabbb4; border-radius: 4px; background: #fff; color: #203a33; font: 15px Arial, sans-serif; }
    input:focus, select:focus { outline: 3px solid #b7d8cc; border-color: #467366; }
    .time-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .time-fields > div { display: grid; gap: 10px; }
    .field-error, .form-error, .success, .notice { margin: 4px 0; padding: 11px; border-radius: 3px; font: 13px/1.5 Arial, sans-serif; }
    .field-error, .form-error { border-left: 3px solid #a12f28; background: #fff1ee; color: #8b2924; }
    .success { border-left: 3px solid #286455; background: #e9f2ee; color: #286455; }
    .notice { width: min(100%, 620px); margin-inline: auto; background: #fff; color: #52635e; }
    button { min-height: 46px; margin-top: 12px; border: 0; border-radius: 4px; background: #286455; color: #fff; cursor: pointer; font: 700 14px Arial, sans-serif; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    @media (max-width: 480px) { form { padding: 18px; } .time-fields { grid-template-columns: 1fr; } }
  `
})
export class ReservaFormComponent implements OnInit {
  private readonly laboratoriesService = inject(LaboratoriosService);
  private readonly reservationsService = inject(ReservasService);
  private readonly errors = inject(ErrorMessageService);

  readonly laboratories = signal<Laboratorio[]>([]);
  readonly loadingLaboratories = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly today = localDateString(new Date());

  readonly form = new FormGroup({
    laboratorioId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  }, { validators: [timeRangeValidator] });

  ngOnInit(): void {
    this.laboratoriesService.getActiveLaboratories().subscribe({
      next: (laboratories) => {
        this.laboratories.set(laboratories);
        this.loadingLaboratories.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loadingLaboratories.set(false);
      }
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { laboratorioId, fecha, horaInicio, horaFin } = this.form.getRawValue();
    if (fecha < this.today) {
      this.errorMessage.set('No se permiten reservas en fechas pasadas.');
      return;
    }

    const request: NuevaReserva = {
      laboratorioId,
      inicio: new Date(`${fecha}T${horaInicio}:00`).toISOString(),
      fin: new Date(`${fecha}T${horaFin}:00`).toISOString()
    };

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.reservationsService.createReservation(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Reserva creada correctamente.');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.errors.getMessage(error));
      }
    });
  }
}