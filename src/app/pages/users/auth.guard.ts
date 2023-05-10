import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from "@angular/router";
import {UserService} from "../../services/user.service";
import {Injectable} from "@angular/core";
import {User} from "../../models/user.model";
import {firstValueFrom} from "rxjs";

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate{

  constructor(private userService:UserService, private router: Router){}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {

    if (this.userService.user === undefined){
      if (this.userService.isAdmin()){
        return true;
      }
    }else{
      //Sometimes the guard here is calling first then the APP_INITIALIZER
      await firstValueFrom(this.userService.getUserDetails())
      if (this.userService.isAdmin()){
        return true;
      }
    }
    this.router.navigate(["/403"]).then();
    return false;
  }



}
