import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { LaboratoriosComponent } from './features/laboratorios/laboratorios.component';
import { MisReservasComponent } from './features/reservas/mis-reservas.component';
import { ReservaFormComponent } from './features/reservas/reserva-form.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'laboratorios', component: LaboratoriosComponent, canActivate: [authGuard] },
	{ path: 'reservas/nueva', component: ReservaFormComponent, canActivate: [authGuard] },
	{ path: 'mis-reservas', component: MisReservasComponent, canActivate: [authGuard] },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'laboratorios' },
	{ path: '**', redirectTo: 'laboratorios' }
];
