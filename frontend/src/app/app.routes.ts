import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard, studentGuard } from './core/auth/auth.guard';
import { teacherGuard } from './core/auth/teacher.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';
import { LaboratoriosComponent } from './features/laboratorios/laboratorios.component';
import { LaboratoriosAdminComponent } from './features/laboratorios/laboratorios-admin.component';
import { MisReservasComponent } from './features/reservas/mis-reservas.component';
import { HorariosComponent } from './features/sesiones/horarios.component';
import { SesionesDocenteComponent } from './features/sesiones/sesiones-docente.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'laboratorios', component: LaboratoriosComponent, canActivate: [studentGuard] },
	{ path: 'laboratorios/admin', component: LaboratoriosAdminComponent, canActivate: [authGuard, adminGuard] },
	{ path: 'reservas/nueva', redirectTo: 'laboratorios', pathMatch: 'full' },
	{ path: 'mis-reservas', component: MisReservasComponent, canActivate: [studentGuard] },
	{ path: 'horarios', component: HorariosComponent, canActivate: [studentGuard] },
	{ path: 'docente', component: SesionesDocenteComponent, canActivate: [teacherGuard] },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'laboratorios' },
	{ path: '**', redirectTo: 'laboratorios' }
];
