import { Injectable } from '@angular/core';

const tokenStorageKey = 'reservas-laboratorios.jwt';
const userEmailStorageKey = 'reservas-laboratorios.user-email';

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

  getUserEmail(): string | null {
    return localStorage.getItem(userEmailStorageKey);
  }

  setUserEmail(email: string): void {
    localStorage.setItem(userEmailStorageKey, email);
  }

  clearUserEmail(): void {
    localStorage.removeItem(userEmailStorageKey);
  }
}