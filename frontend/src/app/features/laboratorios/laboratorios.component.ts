import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessageService } from '../../core/errors/error-message.service';
import { Laboratorio, LaboratoriosService } from './laboratorios.service';

@Component({
  selector: 'app-laboratorios',
  imports: [RouterLink],
  template: `
    <main class="catalog-page">
      <header class="catalog-header">
        <p class="eyebrow">Espacios académicos</p>
        <h1>Laboratorios</h1>
        <p class="intro">Consulta capacidad y ubicación antes de planear tu sesión.</p>
        @if (administrator) {
          <a class="admin-link" routerLink="/laboratorios/admin">Administrar laboratorios</a>
        }
      </header>

      @if (loading()) {
        <p class="status" role="status">Cargando laboratorios…</p>
      } @else if (errorMessage()) {
        <p class="error" role="alert">{{ errorMessage() }}</p>
      } @else if (laboratories().length === 0) {
        <p class="empty" data-testid="empty-state">No hay laboratorios activos disponibles.</p>
      } @else {
        <section class="catalog-list" aria-label="Laboratorios activos">
          @for (laboratory of laboratories(); track laboratory.id) {
            <article class="laboratory" data-testid="laboratory-item">
              <div class="laboratory-title">
                <h2>{{ laboratory.nombre }}</h2>
                <span class="capacity">{{ laboratory.capacidad }} personas</span>
              </div>
              <p class="location"><span aria-hidden="true">⌖</span> {{ laboratory.ubicacion }}</p>
              <span
                class="availability"
                [class.occupied]="isOccupied(laboratory)"
                [attr.aria-label]="isOccupied(laboratory) ? 'Ocupado / En Sesión' : 'Disponible'"
              >
                {{ isOccupied(laboratory) ? 'Ocupado / En Sesión' : 'Disponible' }}
              </span>
            </article>
          }
        </section>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .catalog-page {
      min-height: 100vh;
      box-sizing: border-box;
      padding: clamp(28px, 7vw, 76px) max(24px, calc((100vw - 1040px) / 2));
      background: #f1f5f2;
      color: #203a33;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .catalog-header { max-width: 660px; margin-bottom: 34px; }
    .eyebrow { margin: 0 0 12px; color: #467366; font: 700 12px/1.4 Arial, sans-serif; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(34px, 6vw, 56px); line-height: 1.05; }
    .intro { margin: 14px 0 0; color: #52635e; font: 16px/1.5 Arial, sans-serif; }
    .admin-link { display: inline-flex; min-height: 38px; align-items: center; margin-top: 16px; padding: 0 12px; border: 1px solid #aabbb4; border-radius: 4px; color: #315b4e; font: 700 12px Arial, sans-serif; text-decoration: none; }
    .catalog-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 12px; }
    .laboratory { min-width: 0; padding: 20px; border: 1px solid #d1ddd7; border-left: 4px solid #46806f; border-radius: 4px; background: #fff; }
    .laboratory-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    h2 { min-width: 0; margin: 0; font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; }
    .capacity { flex: 0 0 auto; padding: 5px 7px; border-radius: 3px; background: #e9f2ee; color: #315b4e; font: 700 12px/1.3 Arial, sans-serif; }
    .location { margin: 16px 0 0; color: #52635e; font: 14px/1.45 Arial, sans-serif; overflow-wrap: anywhere; }
    .location span { color: #467366; }
    .availability { display: inline-flex; margin-top: 14px; padding: 5px 9px; border-radius: 999px; background: #e9f2ee; color: #286455; font: 700 12px/1.3 Arial, sans-serif; }
    .availability.occupied { background: #fff1ee; color: #a12f28; }
    .status, .empty, .error { padding: 18px; border-radius: 4px; font: 15px/1.5 Arial, sans-serif; }
    .status, .empty { background: #fff; color: #52635e; }
    .error { border-left: 3px solid #a12f28; background: #fff1ee; color: #8b2924; }
  `
})
export class LaboratoriosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(LaboratoriosService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly administrator = this.auth.isAdministrator();
  readonly laboratories = signal<Laboratorio[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadLaboratories();
    interval(30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadLaboratories(false));
  }

  isOccupied(laboratory: Laboratorio): boolean {
    if (!laboratory.ocupado) {
      return false;
    }

    if (!laboratory.ocupadoHasta) {
      return true;
    }

    return Date.now() <= Date.parse(laboratory.ocupadoHasta);
  }

  private loadLaboratories(initialLoad = true): void {
    if (initialLoad) {
      this.loading.set(true);
    }
    this.service.getActiveLaboratories().subscribe({
      next: (laboratories) => {
        this.laboratories.set(laboratories);
        this.errorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.errors.getMessage(error));
        this.loading.set(false);
      }
    });
  }
}