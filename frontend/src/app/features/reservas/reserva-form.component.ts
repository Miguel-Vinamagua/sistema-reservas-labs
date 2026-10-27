import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reserva-form',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="legacy-reservation">
      <div class="reservation-container">
        <div class="pro-card">
          <div class="icon-badge">📌</div>
          <h1>Reserva de cupos</h1>
          <p class="description">La reserva de cupos se realiza de forma directa desde el catálogo general de laboratorios y sesiones activas.</p>
          <a class="btn-action" routerLink="/laboratorios">Ver sesiones disponibles</a>
        </div>
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }

    .legacy-reservation {
      min-height: 100vh;
      box-sizing: border-box;
      padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reservation-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .pro-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      border-top: 4px solid #2563eb;
    }

    .icon-badge {
      font-size: 36px;
      margin-bottom: 16px;
      background: #eff6ff;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    h1 {
      margin: 0 0 12px;
      font-size: clamp(26px, 4vw, 34px);
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .description {
      margin: 0 0 28px;
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
      max-width: 440px;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 46px;
      padding: 0 24px;
      background: #2563eb;
      color: white;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14.5px;
      text-decoration: none;
      transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    .btn-action:hover {
      background: #1d4ed8;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
      transform: translateY(-1px);
    }

    .btn-action:active {
      transform: translateY(0);
    }
  `
})
export class ReservaFormComponent {}