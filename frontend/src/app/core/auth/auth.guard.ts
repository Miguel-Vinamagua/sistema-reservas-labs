import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

export const studentGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const role = auth.getRole();
  if (role === 'estudiante') {
    return true;
  }
  if (role === 'docente') {
    if (state.url.split('?')[0] === '/laboratorios') {
      return true;
    }
    return router.createUrlTree(['/docente']);
  }
  if (role === 'administrador') {
    return router.createUrlTree(['/laboratorios/admin']);
  }

  return router.createUrlTree(['/login']);
};