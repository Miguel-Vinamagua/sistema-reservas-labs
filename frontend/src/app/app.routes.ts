import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'home' },
	{ path: '**', redirectTo: 'home' }
];
