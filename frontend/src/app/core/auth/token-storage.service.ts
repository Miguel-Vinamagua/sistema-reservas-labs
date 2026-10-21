import { Injectable } from '@angular/core';

const tokenStorageKey = 'reservas-laboratorios.jwt';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return localStorage.getItem(tokenStorageKey);
  }

  setToken(token: string): void {
    localStorage.setItem(tokenStorageKey, token);
  }

  clearToken(): void {
    localStorage.removeItem(tokenStorageKey);
  }
}