import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

export type EstadoReserva = 'activa' | 'cancelada' | 'finalizada';

export interface Reserva {
  id: string;
  sesionLaboratorio: string;
  usuario: string;
  estado: Exclude<EstadoReserva, 'finalizada'>;
}

export interface ReservaPropia {
  id: string;
  sesionLaboratorio: string | null;
  laboratorio: {
    id: string;
    nombre: string;
    ubicacion: string;
  } | null;
  docente: {
    id: string;
    correo: string;
  } | null;
  materia: string | null;
  actividad: string | null;
  fecha: string | null;
  inicio: string | null;
  fin: string | null;
  capacidadMax: number | null;
  inscritosCount: number | null;
  estado: EstadoReserva;
}

export interface NuevaReserva {
  sesionLaboratorioId: string;
}

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly api = inject(ApiService);

  getMyReservations(): Observable<ReservaPropia[]> {
    return this.api.get<ApiResponse<ReservaPropia[]>>('/reservas').pipe(
      map(({ data }) => data)
    );
  }

  createReservation(input: NuevaReserva): Observable<Reserva> {
    return this.api.post<ApiResponse<Reserva>>('/reservas', input).pipe(
      map(({ data }) => data)
    );
  }

  cancelReservation(id: string): Observable<Reserva> {
    return this.api.patch<ApiResponse<Reserva>>(`/reservas/${encodeURIComponent(id)}/cancelar`, {}).pipe(
      map(({ data }) => data)
    );
  }
}