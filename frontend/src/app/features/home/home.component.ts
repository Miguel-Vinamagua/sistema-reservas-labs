import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <main class="home-page">
      <p class="eyebrow">Portal académico</p>
      <h1>Reservas de laboratorios</h1>
      <p>Tu sesión está activa.</p>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .home-page { min-height: 100vh; box-sizing: border-box; padding: 12vh 10vw; background: #edf3ef; color: #203a33; font-family: Georgia, 'Times New Roman', serif; }
    .eyebrow { color: #467366; font: 700 12px Arial, sans-serif; text-transform: uppercase; }
    h1 { max-width: 12ch; font-size: clamp(36px, 8vw, 76px); line-height: 1; }
  `
})
export class HomeComponent {}