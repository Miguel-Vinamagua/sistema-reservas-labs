import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

export type EstadoSesionLaboratorio = 'abierta' | 'llena' | 'cancelada' | 'finalizada';
export type EstadoSesionEstudiante = 'abierta' | 'disponible' | 'llena' | 'cancelada' | 'finalizada';

export interface MateriaDocente {
  id: string;
  nombre: string;
  codigo: string;
  docente: string;
}

export interface SesionLaboratorio {
  id: string;
  laboratorio: {
    id: string;
    nombre: string;
    ubicacion: string;
  };
  docente: string;
  materia: string;
  actividad: string;
  fecha: string;
  inicio: string;
  fin: string;
  cupos: number;
  inscritosCount: number;
  estado: EstadoSesionLaboratorio;
}

export interface SesionEstudiante {
  id: string;
  laboratorio: {
    id: string;
    nombre: string;
    ubicacion: string;
  };
  docente: {
    id: string;
    correo: string;
  };
  materia: string;
  actividad: string;
  fecha: string;
  inicio: string;
  fin: string;
  capacidadMax: number;
  inscritosCount: number;
  estado: EstadoSesionEstudiante;
}

export interface NuevaSesionLaboratorio {
  laboratorioId: string;
  materia: string;
  actividad: string;
  inicio: string;
  fin: string;
}

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SesionesService {
  private readonly api = inject(ApiService);

  getMySubjects(): Observable<MateriaDocente[]> {
    return this.api.get<ApiResponse<MateriaDocente[]>>('/materias').pipe(
      map(({ data }) => data)
    );
  }

  getMySessions(): Observable<SesionLaboratorio[]> {
    return this.api.get<ApiResponse<SesionLaboratorio[]>>('/sesiones-laboratorio/mias').pipe(
      map(({ data }) => data)
    );
  }

  getAvailableSessions(): Observable<SesionEstudiante[]> {
    return this.api.get<ApiResponse<SesionEstudiante[]>>('/sesiones-laboratorio').pipe(
      map(({ data }) => data)
    );
  }

  getSchedule(): Observable<SesionEstudiante[]> {
    // CORREGIDO: Apunta a '/sesiones-laboratorio' para evitar el error 404
    return this.api.get<ApiResponse<SesionEstudiante[]>>('/sesiones-laboratorio').pipe(
      map(({ data }) => data)
    );
  }

  createSession(input: NuevaSesionLaboratorio): Observable<SesionLaboratorio> {
    return this.api.post<ApiResponse<SesionLaboratorio>>(
      '/sesiones-laboratorio',
      input
    ).pipe(map(({ data }) => data));
  }

  cancelSession(id: string): Observable<SesionLaboratorio> {
    return this.api.patch<ApiResponse<SesionLaboratorio>>(
      `/sesiones-laboratorio/${encodeURIComponent(id)}/cancelar`,
      {}
    ).pipe(map(({ data }) => data));
  }
}