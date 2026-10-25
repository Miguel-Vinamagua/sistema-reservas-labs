import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { teacherGuard } from './core/auth/teacher.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { LaboratoriosComponent } from './features/laboratorios/laboratorios.component';
import { LaboratoriosAdminComponent } from './features/laboratorios/laboratorios-admin.component';
import { MisReservasComponent } from './features/reservas/mis-reservas.component';
import { ReservaFormComponent } from './features/reservas/reserva-form.component';
import { SesionesDocenteComponent } from './features/sesiones/sesiones-docente.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'laboratorios', component: LaboratoriosComponent, canActivate: [authGuard] },
	{ path: 'laboratorios/admin', component: LaboratoriosAdminComponent, canActivate: [authGuard, adminGuard] },
	{ path: 'reservas/nueva', component: ReservaFormComponent, canActivate: [authGuard] },
	{ path: 'mis-reservas', component: MisReservasComponent, canActivate: [authGuard] },
	{ path: 'docente', component: SesionesDocenteComponent, canActivate: [teacherGuard] },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'laboratorios' },
	{ path: '**', redirectTo: 'laboratorios' }
];
