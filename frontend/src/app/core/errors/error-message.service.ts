import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

interface ApiErrorPayload {
  error?: {
    message?: unknown;
  };
}

@Injectable({ providedIn: 'root' })
export class ErrorMessageService {
  getMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as ApiErrorPayload | null;
      if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) {
        return payload.error.message;
      }
    }

    return 'No se pudo completar la solicitud.';
  }
}