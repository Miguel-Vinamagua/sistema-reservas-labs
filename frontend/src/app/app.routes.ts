import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { LaboratoriosComponent } from './features/laboratorios/laboratorios.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'laboratorios', component: LaboratoriosComponent, canActivate: [authGuard] },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'laboratorios' },
	{ path: '**', redirectTo: 'laboratorios' }
];
