import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reserva-form',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="legacy-reservation">
      <h1>Reserva de cupos</h1>
      <p>La reserva de cupos se realiza desde Laboratorios.</p>
      <a routerLink="/laboratorios">Ver sesiones disponibles</a>
    </main>
  `,
  styles: `
    .legacy-reservation {
      min-height: 100vh;
      box-sizing: border-box;
      padding: clamp(28px, 7vw, 72px) max(24px, calc((100vw - 960px) / 2));
      background: #f1f5f2;
      color: #203a33;
      font-family: Georgia, 'Times New Roman', serif;
    }
    h1 { font-size: clamp(32px, 6vw, 50px); }
    p, a { font: 15px/1.5 Arial, sans-serif; }
    a { color: #286455; font-weight: 700; }
  `
})
export class ReservaFormComponent {}
