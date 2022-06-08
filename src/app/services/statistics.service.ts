import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Statistics } from '../models/statistics.model';
import { plainToClass } from 'class-transformer';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

    private url:string = '/statistics';

    constructor(private http: HttpClient) { 
        this.url = environment.apiBaseUrl + this.url;
    }

    getKeyFigures(): Observable<Statistics>  {
        return this.http.get<Statistics>(this.url).pipe(
            map((data:any) => {
                return plainToClass(Statistics, data);
            })
        );
    }

}
