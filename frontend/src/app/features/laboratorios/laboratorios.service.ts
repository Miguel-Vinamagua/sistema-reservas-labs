import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

export interface Laboratorio {
  id: string;
  nombre: string;
  capacidad: number;
  ubicacion: string;
  activo?: boolean;
}

interface LaboratoryListResponse {
  data: Laboratorio[];
}

export interface LaboratorioInput {
  nombre: string;
  capacidad: number;
  ubicacion: string;
}

@Injectable({ providedIn: 'root' })
export class LaboratoriosService {
  private readonly api = inject(ApiService);

  getActiveLaboratories(): Observable<Laboratorio[]> {
    return this.api.get<LaboratoryListResponse>('/laboratorios').pipe(
      map(({ data }) => data.filter((laboratory) => laboratory.activo !== false))
    );
  }

  getAllLaboratories(): Observable<Laboratorio[]> {
    return this.api.get<LaboratoryListResponse>('/laboratorios').pipe(map(({ data }) => data));
  }

  createLaboratory(input: LaboratorioInput): Observable<Laboratorio> {
    return this.api.post<{ data: Laboratorio }>('/laboratorios', input).pipe(map(({ data }) => data));
  }

  updateLaboratory(id: string, input: LaboratorioInput): Observable<Laboratorio> {
    return this.api.patch<{ data: Laboratorio }>(`/laboratorios/${encodeURIComponent(id)}`, input).pipe(
      map(({ data }) => data)
    );
  }

  deactivateLaboratory(id: string): Observable<Laboratorio> {
    return this.api.patch<{ data: Laboratorio }>(
      `/laboratorios/${encodeURIComponent(id)}/desactivar`,
      {}
    ).pipe(map(({ data }) => data));
  }
}