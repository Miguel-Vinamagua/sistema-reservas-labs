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

@Injectable({ providedIn: 'root' })
export class LaboratoriosService {
  private readonly api = inject(ApiService);

  getActiveLaboratories(): Observable<Laboratorio[]> {
    return this.api.get<LaboratoryListResponse>('/laboratorios').pipe(
      map(({ data }) => data.filter((laboratory) => laboratory.activo !== false))
    );
  }
}