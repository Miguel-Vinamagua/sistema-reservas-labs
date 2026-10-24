import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [NavbarComponent, RouterOutlet],
  template: `
    <app-navbar />
    <router-outlet />
  `,
  styles: ':host { display: block; min-height: 100vh; }'
})
export class App {}
