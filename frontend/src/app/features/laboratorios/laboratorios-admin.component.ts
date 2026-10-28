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
      <div class="admin-container">
        <header class="page-header">
          <a class="back-link" routerLink="/laboratorios" href="/laboratorios"> </a>
          <span class="eyebrow">Panel de administración</span>
          <h1>Administrar laboratorios</h1>
          <p class="intro">Gestiona la información de los espacios académicos, su capacidad y disponibilidad operativa.</p>
        </header>

        @if (!administrator) {
          <div class="alert-box error" role="alert">
            <span class="alert-icon">⚠️</span>
            <p>No tienes permisos institucionales para administrar laboratorios.</p>
          </div>
        } @else {
          <section class="pro-card editor-section" aria-labelledby="editor-title">
            <h2 id="editor-title" class="section-title">{{ editingId() ? 'Editar laboratorio' : 'Registrar nuevo laboratorio' }}</h2>
            
            <div class="editor-grid-layout">
              <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="admin-form">
                <div class="input-group">
                  <label for="nombre">Nombre del laboratorio</label>
                  <input id="nombre" class="pro-input" formControlName="nombre" autocomplete="off" placeholder="Ej. Laboratorio de Redes y Computación" required />
                  @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
                    <p class="field-error">El nombre es obligatorio.</p>
                  }
                </div>

                <div class="input-group">
                  <label for="capacidad">Capacidad máxima (puestos)</label>
                  <input id="capacidad" class="pro-input" type="number" min="1" step="1" formControlName="capacidad" placeholder="Ej. 30" required />
                  @if (form.controls.capacidad.touched && form.controls.capacidad.invalid) {
                    <p class="field-error">La capacidad debe ser un número entero positivo.</p>
                  }
                </div>

                <div class="input-group">
                  <label for="ubicacion">Ubicación / Edificio</label>
                  <input id="ubicacion" class="pro-input" formControlName="ubicacion" autocomplete="off" placeholder="Ej. Edificio B, Planta Baja" required />
                  @if (form.controls.ubicacion.touched && form.controls.ubicacion.invalid) {
                    <p class="field-error">La ubicación es obligatoria.</p>
                  }
                </div>

                @if (errorMessage()) {
                  <div class="alert-box error" role="alert">
                    <span class="alert-icon">⚠️</span>
                    <p>{{ errorMessage() }}</p>
                  </div>
                }
                @if (successMessage()) {
                  <div class="alert-box success" role="status">
                    <span class="alert-icon">✓</span>
                    <p>{{ successMessage() }}</p>
                  </div>
                }

                <div class="form-actions">
                  <button class="btn-action" type="submit" [disabled]="form.invalid || saving()">
                    @if (saving()) {
                      <span class="spinner-small"></span>
                      <span>Guardando cambios…</span>
                    } @else {
                      <span>{{ editingId() ? 'Guardar cambios' : 'Crear laboratorio' }}</span>
                    }
                  </button>
                  @if (editingId()) {
                    <button class="btn-secondary" type="button" (click)="cancelEdit()">Cancelar edición</button>
                  }
                </div>
              </form>

              <div class="image-wrapper">
                <div class="illustration-card">
                  <span class="illustration-icon">🏛️</span>
                  <p class="illustration-text">Control total de infraestructura académica y espacios institucionales.</p>
                </div>
              </div>
            </div>
          </section>

          <section class="inventory" aria-labelledby="inventory-title">
            <h2 id="inventory-title" class="section-title">Infraestructura registrada</h2>
            @if (loading()) {
              <div class="state-container" role="status">
                <div class="spinner-pro"></div>
                <p class="status">Cargando inventario de laboratorios…</p>
              </div>
            } @else if (laboratories().length === 0) {
              <div class="empty-state" data-testid="empty-state">
                <div class="empty-icon">🏢</div>
                <h3>Sin laboratorios registrados</h3>
                <p>Utiliza el formulario superior para dar de alta el primer espacio académico.</p>
              </div>
            } @else {
              <div class="laboratory-grid-list">
                @for (laboratory of laboratories(); track laboratory.id) {
                  <article class="laboratory-row-card">
                    <div class="laboratory-info">
                      <h3>{{ laboratory.nombre }}</h3>
                      <p class="meta-info">📍 {{ laboratory.ubicacion }} &nbsp;•&nbsp; 👥 {{ laboratory.capacidad }} puestos</p>
                    </div>
                    <span class="status-badge" [class.inactive]="laboratory.activo === false">
                      {{ laboratory.activo === false ? 'Inactivo' : 'Activo' }}
                    </span>
                    <div class="row-actions">
                      <button class="btn-sm secondary" type="button" (click)="edit(laboratory)">Editar</button>
                      @if (laboratory.activo !== false) {
                        <button class="btn-sm danger" type="button" (click)="deactivate(laboratory)">Desactivar</button>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    
    .admin-page { 
      min-height: 100vh; 
      box-sizing: border-box; 
      padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px); 
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
      color: #0f172a; 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    }

    .admin-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header { 
      margin-bottom: 40px; 
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 24px;
    }

    .back-link { 
      color: #2563eb; 
      font-weight: 600;
      font-size: 13.5px; 
      text-decoration: none; 
      display: inline-flex; 
      align-items: center;
      gap: 6px;
      margin-bottom: 16px; 
      transition: color 0.2s ease;
    }

    .back-link:hover {
      color: #1d4ed8;
    }

    .eyebrow { 
      display: inline-block;
      margin: 0 0 10px; 
      padding: 4px 12px;
      background: #eff6ff;
      color: #1d4ed8; 
      font-weight: 700;
      font-size: 11px; 
      text-transform: uppercase; 
      letter-spacing: 0.06em;
      border-radius: 20px;
    }

    h1 { 
      margin: 0; 
      font-size: clamp(30px, 5vw, 46px); 
      font-weight: 800;
      line-height: 1.1; 
      color: #0f172a;
      letter-spacing: -0.03em;
    }

    .intro { 
      margin: 10px 0 0; 
      color: #475569; 
      font-size: 15px; 
    }
    
    .pro-card, .inventory { 
      margin-top: 24px; 
      padding: 32px; 
      border: 1px solid #e2e8f0; 
      border-radius: 14px; 
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
    }

    .editor-section {
      border-top: 4px solid #2563eb;
    }
    
    .editor-grid-layout {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 40px;
      align-items: center;
      margin-top: 20px;
    }

    .image-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .illustration-card {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }

    .illustration-icon {
      font-size: 48px;
    }

    .illustration-text {
      margin: 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.5;
    }

    .section-title { 
      margin: 0; 
      font-size: 20px; 
      font-weight: 700;
      color: #0f172a;
    }

    .admin-form { 
      display: flex;
      flex-direction: column;
      gap: 18px; 
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label { 
      font-weight: 600; 
      font-size: 13px; 
      color: #1e293b; 
    }

    .pro-input { 
      width: 100%; 
      height: 46px; 
      box-sizing: border-box; 
      padding: 0 14px; 
      border: 1.5px solid #cbd5e1; 
      border-radius: 8px; 
      background: #f8fafc; 
      color: #0f172a; 
      font-size: 14.5px;
      transition: all 0.2s ease;
    }

    .pro-input:focus { 
      outline: none;
      border-color: #2563eb; 
      background: #fff;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .form-actions { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 12px; 
      margin-top: 4px;
    }

    .btn-action { 
      height: 44px; 
      padding: 0 20px; 
      border: 0; 
      border-radius: 8px; 
      background: #2563eb; 
      color: white; 
      cursor: pointer; 
      font-weight: 600;
      font-size: 13.5px; 
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      transition: all 0.2s ease;
    }

    .btn-action:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
      transform: translateY(-1px);
    }

    .btn-action:disabled { cursor: not-allowed; opacity: .55; box-shadow: none; }

    .btn-secondary { 
      height: 44px;
      padding: 0 18px;
      border: 1.5px solid #cbd5e1; 
      border-radius: 8px;
      background: #ffffff; 
      color: #334155; 
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .laboratory-grid-list { 
      display: grid; 
      gap: 14px; 
      margin-top: 20px;
    }

    .laboratory-row-card { 
      display: grid; 
      grid-template-columns: minmax(0, 1fr) auto auto; 
      align-items: center; 
      gap: 20px; 
      padding: 16px 20px; 
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fafdfc;
      transition: border-color 0.2s ease;
    }

    .laboratory-row-card:hover {
      border-color: #cbd5e1;
    }

    h3 { 
      margin: 0; 
      font-size: 17px; 
      font-weight: 700;
      color: #0f172a;
      overflow-wrap: anywhere; 
    }

    .meta-info { 
      margin: 6px 0 0; 
      color: #64748b; 
      font-size: 13.5px; 
    }

    .status-badge { 
      display: inline-flex;
      padding: 4px 10px; 
      border-radius: 20px; 
      background: #ecfdf5; 
      color: #047857; 
      font-weight: 700;
      font-size: 11.5px; 
      letter-spacing: 0.02em;
    }

    .status-badge.inactive { 
      background: #f1f5f9; 
      color: #64748b; 
    }

    .row-actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      height: 36px;
      padding: 0 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12.5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-sm.secondary {
      border: 1.5px solid #cbd5e1;
      background: white;
      color: #334155;
    }

    .btn-sm.secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-sm.danger {
      border: 1.5px solid #fca5a5;
      background: #fef2f2;
      color: #dc2626;
    }

    .btn-sm.danger:hover {
      background: #dc2626;
      color: white;
      border-color: #dc2626;
    }

    .field-error { 
      margin: 4px 0 0; 
      color: #dc2626; 
      font-size: 12px; 
      font-weight: 500; 
    }

    .alert-box { 
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
    }

    .alert-box p { margin: 0; }
    .alert-box.success { border-left: 4px solid #059669; background: #ecfdf5; color: #065f46; }
    .alert-box.error { border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; }
    .alert-icon { font-weight: bold; }

    .state-container, .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .status { margin: 0; color: #64748b; font-size: 15px; font-weight: 500; }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 6px; font-size: 18px; color: #0f172a; }
    .empty-state p { margin: 0; color: #64748b; font-size: 14px; }

    .spinner-pro {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(37, 99, 235, 0.15);
      border-radius: 50%;
      border-top-color: #2563eb;
      animation: spin 0.7s linear infinite;
    }

    .spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @media (max-width: 900px) { 
      .editor-grid-layout { grid-template-columns: 1fr; } 
      .image-wrapper { display: none; }
    }
    @media (max-width: 700px) { 
      .laboratory-row-card { grid-template-columns: 1fr; gap: 12px; } 
      .row-actions { width: 100%; justify-content: flex-start; } 
    }
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
        this.successMessage.set(editingId ? 'Laboratorio actualizado correctamente.' : 'Laboratorio creado correctamente.');
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
    if (!this.administrator || laboratory.activo === false || !window.confirm(`¿Estás seguro de desactivar ${laboratory.nombre}?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.service.deactivateLaboratory(laboratory.id).subscribe({
      next: (updated) => {
        this.upsertLaboratory(updated);
        this.successMessage.set('Laboratorio desactivado con éxito. Las reservas existentes se conservan.');
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