import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

export type EstadoReserva = 'activa' | 'cancelada';

export interface Reserva {
  id: string;
  laboratorio: string;
  usuario: string;
  inicio: string;
  fin: string;
  estado: EstadoReserva;
}

export interface ReservaPropia {
  id: string;
  laboratorio: {
    id: string;
    nombre: string;
    ubicacion: string;
  };
  inicio: string;
  fin: string;
  estado: EstadoReserva;
}

export interface NuevaReserva {
  laboratorioId: string;
  inicio: string;
  fin: string;
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