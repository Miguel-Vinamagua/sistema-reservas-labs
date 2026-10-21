import { HttpErrorResponse } from '@angular/common/http';
import { ErrorMessageService } from './error-message.service';

describe('ErrorMessageService', () => {
  let errors: ErrorMessageService;

  beforeEach(() => {
    errors = new ErrorMessageService();
  });

  it('uses a backend error message when available', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { error: { message: 'Credenciales inválidas.' } }
    });

    expect(errors.getMessage(error)).toBe('Credenciales inválidas.');
  });

  it('returns a stable fallback for unexpected errors', () => {
    expect(errors.getMessage(new Error('private detail'))).toBe('No se pudo completar la solicitud.');
  });
});