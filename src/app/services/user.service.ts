import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';
import {EMPTY, Observable, throwError} from 'rxjs';
import { plainToInstance } from 'class-transformer';
import {User} from "../models/user.model";
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class UserService {

    private readonly url:string = '/users';

    public user:User = new User();

    constructor(private http: HttpClient,
                @Inject(PLATFORM_ID) private platformId: Object) {
      this.url = environment.api + this.url;
    }

    getCurrentUser(): Observable<User> {
        return this.http.get<any>(`${this.url}/currentUser`).pipe(
           map((data:Object) => {
              //console.log("GET USER DETAILS, DATA",data);
              if (Object.keys(data).length) {
                this.user = plainToInstance(User, data);
              }else{
                this.user = new User();
              }
             return this.user;
           }),
          catchError(err => {
            console.error("ERR",err);
            return EMPTY;
          })
      )
    }

    getUsers(): Observable<User[]> {
      return this.http.get<any>(this.url).pipe(
        map((data:Object[]) => {
          return plainToInstance(User, data);
        }),
        catchError(err => {
          console.error("ERR",err);
          return EMPTY;
        })
      )
    }

    addUser(userid:string, role:string, active: boolean, allowed_cci_qids: string[], expiration_time:Date): Observable<User> {
      const adjustedExpirationTime = expiration_time ? new Date(expiration_time.getTime() - expiration_time.getTimezoneOffset() * 60000) : null;
      return this.http.post(this.url,{userid:userid, role:role, active: active, allowed_cci_qids: allowed_cci_qids, expiration_time: adjustedExpirationTime}).pipe(
        map((data:Object) => {
          return plainToInstance(User, data);
        }),
        catchError(err => {
          //console.error("ERR",err);
          return throwError(err.error);
        })
      )
    }

    editUser(userid:string, role:string, active:boolean, allowed_cci_qids: string[], expiration_time:Date): Observable<User> {
      const adjustedExpirationTime = expiration_time ? new Date(expiration_time.getTime() - expiration_time.getTimezoneOffset() * 60000) : null;
      return this.http.put(`${this.url}/${userid}`,{
        userid:userid,
        role:role,
        active:active,
        allowed_cci_qids: allowed_cci_qids,
        expiration_time: adjustedExpirationTime}).pipe(
        map((data:Object) => {
          return plainToInstance(User, data);
        }),
        catchError(err => {
          console.error("ERR",err);
          return EMPTY;
        })
      )
    }

    updateProfile(userid:string, name:string, email:string, organization:string): Observable<User> {
      return this.http.put(`${this.url}/updateProfile`,{
        userid:userid,
        name:name,
        email:email,
        organization: organization
      }).pipe(
        map((data:Object) => {
          return plainToInstance(User, data);
        }),
        catchError(err => {
          console.error("ERR",err);
          return EMPTY;
        })
      )
    }

    deleteUser(userid:string): Observable<any> {
      return this.http.delete(`${this.url}/${userid}`).pipe(
        map((data:Object) => {
          return data;
        }),
        catchError(err => {
          console.error("ERR",err);
          return EMPTY;
        })
      )
    }

    impersonateUser(impersonateUserId:string): Observable<User> {
      return this.http.get<any>(this.url+'/impersonateUser/'+impersonateUserId).pipe(
        map((data:Object) => {
          return plainToInstance(User, data);
        }),
        catchError(err => {
          console.error("ERR",err);
          return EMPTY;
        })
      )
    }

    refreshUser(){
      setTimeout(()=>{
        this.getCurrentUser().subscribe((user)=>{
          this.user = user;
        });
        this.refreshUser();
      },5000)
    }

  isAdmin():boolean{
      return this.user && this.user.role == 'ADMIN' ? true : false;
  }

  isLoggedIn():boolean{
      return (typeof this.user !== 'undefined'
        && Object.keys(this.user).length > 0
        && (this.user && this.user.user_id != undefined));
  }

  canApprove():boolean{
      return this.user && (this.user.role == 'REVIEWER' ||
      this.user.role == 'ADMIN') ? true : false;
  }

  isEditor():boolean{
      return (this.user && this.user.role == 'EDITOR') ? true : false;
  }
  isReviewer():boolean{
    return (this.user && this.user.role == 'REVIEWER') ? true : false;
  }

}
