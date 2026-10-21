import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { TokenStorageService } from './token-storage.service';

export interface LoginCredentials {
  correo: string;
  password: string;
}

export interface AuthUser {
  id: string;
  correo: string;
  rol: 'estudiante' | 'docente' | 'administrador';
}

export interface LoginResponse {
  data: {
    token: string;
    user: AuthUser;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenStorage = inject(TokenStorageService);

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', credentials).pipe(
      tap((response) => this.tokenStorage.setToken(response.data.token))
    );
  }

  isAuthenticated(): boolean {
    return Boolean(this.tokenStorage.getToken());
  }

  getRole(): AuthUser['rol'] | null {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
      const role = (JSON.parse(decoded) as { rol?: unknown }).rol;
      return role === 'estudiante' || role === 'docente' || role === 'administrador'
        ? role
        : null;
    } catch {
      return null;
    }
  }

  isAdministrator(): boolean {
    return this.getRole() === 'administrador';
  }

  logout(): void {
    this.tokenStorage.clearToken();
  }
}