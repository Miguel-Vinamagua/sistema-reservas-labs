import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly userEmail = this.auth.userEmail;
  readonly menuOpen = signal(false);

  get authenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  get administrator(): boolean {
    return this.auth.isAuthenticated() && this.auth.isAdministrator();
  }

  get teacher(): boolean {
    return this.auth.isAuthenticated() && this.auth.getRole() === 'docente';
  }

  get homeRoute(): string {
    if (this.administrator) {
      return '/laboratorios/admin';
    }
    return this.teacher ? '/docente' : this.authenticated ? '/laboratorios' : '/login';
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  logout(): void {
    this.auth.logout();
    this.menuOpen.set(false);
    void this.router.navigateByUrl('/login');
  }
}
