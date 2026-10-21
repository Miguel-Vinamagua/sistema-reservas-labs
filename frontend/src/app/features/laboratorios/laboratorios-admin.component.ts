import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratorioInput, LaboratoriosService } from './laboratorios.service';

const nonBlank: ValidatorFn = (control) => (
  typeof control.value === 'string' && control.value.trim() ? null : { required: true }
);
const positiveInteger: ValidatorFn = (control) => (
  Number.isInteger(control.value) && control.value > 0 ? null : { positiveInteger: true }
);

@Component({
  selector: 'app-laboratorios-admin',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="admin-page">
      <header class="page-header">
        <a routerLink="/laboratorios">← Volver al catálogo</a>
        <p class="eyebrow">Administración</p>
        <h1>Administrar laboratorios</h1>
        <p>Gestiona la información de los espacios y su disponibilidad.</p>
      </header>

      @if (!administrator) {
        <p class="notice" role="alert">No tienes permisos para administrar laboratorios.</p>
      } @else {
        <section class="editor" aria-labelledby="editor-title">
          <h2 id="editor-title">{{ editingId() ? 'Editar laboratorio' : 'Nuevo laboratorio' }}</h2>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="nombre">Nombre</label>
            <input id="nombre" formControlName="nombre" autocomplete="off" required />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <p class="field-error">El nombre es obligatorio.</p>
            }

            <label for="capacidad">Capacidad</label>
            <input id="capacidad" type="number" min="1" step="1" formControlName="capacidad" required />
            @if (form.controls.capacidad.touched && form.controls.capacidad.invalid) {
              <p class="field-error">La capacidad debe ser un entero positivo.</p>
            }

            <label for="ubicacion">Ubicación</label>
            <input id="ubicacion" formControlName="ubicacion" autocomplete="off" required />
            @if (form.controls.ubicacion.touched && form.controls.ubicacion.invalid) {
              <p class="field-error">La ubicación es obligatoria.</p>
            }

            @if (errorMessage()) {
              <p class="form-error" role="alert">{{ errorMessage() }}</p>
            }
            @if (successMessage()) {
              <p class="success" role="status">{{ successMessage() }}</p>
            }

            <div class="form-actions">
              <button type="submit" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Guardando…' : editingId() ? 'Guardar cambios' : 'Crear laboratorio' }}
              </button>
              @if (editingId()) {
                <button class="secondary" type="button" (click)="cancelEdit()">Cancelar edición</button>
              }
            </div>
          </form>
        </section>

        <section class="inventory" aria-labelledby="inventory-title">
          <h2 id="inventory-title">Laboratorios</h2>
          @if (loading()) {
            <p role="status">Cargando laboratorios…</p>
          } @else if (laboratories().length === 0) {
            <p class="notice">Todavía no hay laboratorios registrados.</p>
          } @else {
            <div class="laboratory-list">
              @for (laboratory of laboratories(); track laboratory.id) {
                <article class="laboratory-row">
                  <div class="laboratory-info">
                    <h3>{{ laboratory.nombre }}</h3>
                    <p>{{ laboratory.capacidad }} personas · {{ laboratory.ubicacion }}</p>
                  </div>
                  <span class="status" [class.inactive]="laboratory.activo === false">
                    {{ laboratory.activo === false ? 'Inactivo' : 'Activo' }}
                  </span>
                  <div class="row-actions">
                    <button class="secondary" type="button" (click)="edit(laboratory)">Editar</button>
                    @if (laboratory.activo !== false) {
                      <button class="danger" type="button" (click)="deactivate(laboratory)">Desactivar</button>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </section>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .admin-page { min-height: 100vh; box-sizing: border-box; padding: clamp(24px, 6vw, 64px) max(20px, calc((100vw - 1040px) / 2)); background: #f1f5f2; color: #203a33; font-family: Georgia, 'Times New Roman', serif; }
    .page-header { margin-bottom: 30px; }
    .page-header a { color: #286455; font: 700 13px Arial, sans-serif; text-decoration: none; }
    .eyebrow { margin: 24px 0 10px; color: #467366; font: 700 12px Arial, sans-serif; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(32px, 6vw, 50px); line-height: 1.05; }
    .page-header > p:last-child { color: #52635e; font: 15px/1.5 Arial, sans-serif; }
    .editor, .inventory { margin-top: 18px; padding: 22px; border: 1px solid #d1ddd7; border-radius: 5px; background: #fff; }
    h2 { margin: 0 0 16px; font-size: 22px; }
    form { display: grid; gap: 9px; max-width: 640px; }
    label { margin-top: 6px; font: 700 13px Arial, sans-serif; }
    input { width: 100%; min-height: 42px; box-sizing: border-box; padding: 9px 11px; border: 1px solid #aabbb4; border-radius: 4px; color: #203a33; font: 15px Arial, sans-serif; }
    input:focus { outline: 3px solid #b7d8cc; border-color: #467366; }
    .form-actions, .row-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button { min-height: 38px; padding: 0 13px; border: 0; border-radius: 4px; background: #286455; color: white; cursor: pointer; font: 700 12px Arial, sans-serif; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    button.secondary { border: 1px solid #aabbb4; background: white; color: #315b4e; }
    button.danger { border: 1px solid #a23c32; background: white; color: #8b2924; }
    .laboratory-list { display: grid; gap: 8px; }
    .laboratory-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid #e2e9e5; }
    h3 { margin: 0; font-size: 17px; overflow-wrap: anywhere; }
    .laboratory-info p { margin: 5px 0 0; color: #52635e; font: 13px/1.4 Arial, sans-serif; }
    .status { padding: 5px 7px; border-radius: 3px; background: #e9f2ee; color: #286455; font: 700 11px Arial, sans-serif; }
    .status.inactive { background: #edf0ef; color: #65716d; }
    .field-error, .form-error, .notice, .success { padding: 9px; border-radius: 3px; font: 13px/1.45 Arial, sans-serif; }
    .field-error, .form-error { margin: 0; border-left: 3px solid #a12f28; background: #fff1ee; color: #8b2924; }
    .success { margin: 0; border-left: 3px solid #286455; background: #e9f2ee; color: #286455; }
    .notice { background: #fff; color: #52635e; }
    @media (max-width: 700px) { .laboratory-row { grid-template-columns: minmax(0, 1fr) auto; } .row-actions { grid-column: 1 / -1; } }
  `
})
export class LaboratoriosAdminComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(LaboratoriosService);
  private readonly errors = inject(ErrorMessageService);

  readonly administrator = this.auth.isAdministrator();
  readonly laboratories = signal<Laboratorio[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [nonBlank] }),
    capacidad: new FormControl<number | null>(null, { validators: [Validators.required, positiveInteger] }),
    ubicacion: new FormControl('', { nonNullable: true, validators: [nonBlank] })
  });

  ngOnInit(): void {
    if (!this.administrator) {
      this.loading.set(false);
      return;
    }

    this.loadLaboratories();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (!this.administrator || this.form.invalid || this.saving()) {
      return;
    }

    const raw = this.form.getRawValue();
    const input: LaboratorioInput = {
      nombre: raw.nombre.trim(),
      capacidad: Number(raw.capacidad),
      ubicacion: raw.ubicacion.trim()
    };
    const editingId = this.editingId();

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const operation = editingId
      ? this.service.updateLaboratory(editingId, input)
      : this.service.createLaboratory(input);

    operation.subscribe({
      next: (laboratory) => {
        this.upsertLaboratory(laboratory);
        this.saving.set(false);
        this.successMessage.set(editingId ? 'Laboratorio actualizado.' : 'Laboratorio creado.');
        this.resetForm();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.errors.getMessage(error));
      }
    });
  }

  edit(laboratory: Laboratorio): void {
    if (!this.administrator) {
      return;
    }
    this.editingId.set(laboratory.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.setValue({
      nombre: laboratory.nombre,
      capacidad: laboratory.capacidad,
      ubicacion: laboratory.ubicacion
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  deactivate(laboratory: Laboratorio): void {
    if (!this.administrator || laboratory.activo === false || !window.confirm(`¿Desactivar ${laboratory.nombre}?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.service.deactivateLaboratory(laboratory.id).subscribe({
      next: (updated) => {
        this.upsertLaboratory(updated);
        this.successMessage.set('Laboratorio desactivado. Las reservas existentes se conservan.');
      },
      error: (error: unknown) => this.errorMessage.set(this.errors.getMessage(error))
    });
  }

  private loadLaboratories(): void {
    this.service.getAllLaboratories().subscribe({
      next: (laboratories) => {
        this.laboratories.set(laboratories);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loading.set(false);
      }
    });
  }

  private upsertLaboratory(updated: Laboratorio): void {
    this.laboratories.update((current) => {
      const existingIndex = current.findIndex(({ id }) => id === updated.id);
      if (existingIndex < 0) {
        return [...current, updated];
      }
      return current.map((laboratory) => laboratory.id === updated.id ? updated : laboratory);
    });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', capacidad: null, ubicacion: '' });
  }
}