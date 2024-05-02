import {Component, Inject, Input} from "@angular/core";
import {FormControl, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {UserService} from "../../../services/user.service";
import { catchError, map } from 'rxjs/operators';
import {EMPTY, forkJoin, Observable, Subscriber} from "rxjs";
import {User} from "../../../models/user.model";
import {DialogChildInterface} from "../../../components/ecl/dialog/dialog.child.interface";
import {FilterService} from "../../../services/filter.service";
import {environment} from "../../../../environments/environment";
import {TranslateService} from "../../../services/translate.service";
type roles = { id: string; value: string }
@Component({
  selector: 'user-save-dialog',
  templateUrl: 'user-save-dialog.component.html',
  styleUrls: ['./user-save-dialog.component.scss']
})
export class UserSaveDialogComponent implements DialogChildInterface{

  public myForm!: UntypedFormGroup;
  public errorMessage?:string;
  @Input('data') data: any;
  readonly allRoles: roles[] = [
    { id: 'USER', value: 'USER' },
    { id: 'REVIEWER', value: 'REVIEWER' },
    { id: 'EDITOR', value: 'EDITOR' },
    { id: 'ADMIN', value: 'ADMIN' }
  ];
  readonly roles: roles[] = environment.production ? this.allRoles.filter(role => role.id !== 'USER') : this.allRoles;
  public countries:any[] = [];
  public ccis:any[] = [];
  public ccis_list:any[] = [];
  public editMode:boolean = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public userService:UserService,
    private filterService: FilterService,
    private translateService: TranslateService
  ) {
  }

  ngOnInit(): void {
    this.myForm = this.formBuilder.group({
      'formType': 'addUser',
      'userid': new FormControl(this.data ? this.data.user_id : ''),
      'email': new FormControl(this.data ? this.data.email : ''),
      'role': this.data ? this.data.role : 'USER',
      'active': this.data ? this.data.active : true,
      'country': '',
      'cci': '',
      'ccis': new FormControl(this.data && this.data.allowed_cci_qids ? [...this.data.allowed_cci_qids] : new Array()),
      'expiration': this.data && this.data.expiration_time ? new Date(this.data.expiration_time) : undefined,
    })

    if (this.data && this.data.allowed_cci_qids){
      const programLabelsObservables:any[] = []
      this.data.allowed_cci_qids.forEach((allowed_ccid:string)=>{
        programLabelsObservables.push(this.filterService.getFilter("programs",
          {qid:environment.entityURL+allowed_ccid}));
      })
      forkJoin(programLabelsObservables).subscribe((results:any)=>{
        results.forEach((result:any,index:number)=>{
          if (result && result.programs && result.programs.length){
            this.ccis_list.push({
              cci: this.data.allowed_cci_qids[index],
              label:result.programs[0].value
            })
          }
        })
      })
    }

    this.filterService.getFilter("countries", {}).subscribe(result => {
      this.countries = result.countries;
    });

    if (this.data){
      this.editMode = true;
      this.myForm.get('userid')?.disable();
    }
  }

  getEmailValue(): string[] {
    const emailValue = this.myForm.value.email;
    return emailValue.split(/[ ,]+/).length > 1 ? emailValue.split(/[ ,]+/).filter((address: string) => address.trim() !== '') : emailValue;
  }

  beforeSave():Observable<boolean>{
    return new Observable<boolean>((observer:Subscriber<boolean>)=>{
      if(!this.myForm.value.email) {
        this.errorMessage = this.translateService.userManagement.messages.emailMandatory;
      } else if (['EDITOR', 'REVIEWER'].includes(this.myForm.value.role) && !this.myForm.value.ccis.length) {
        this.errorMessage = this.translateService.userManagement.messages.CCIMandatory;
      }
      else {
        if (this.myForm.value.formType == 'invitation'){
          this.userService.inviteUser(this.getEmailValue(),
            this.myForm.value.role,
            this.myForm.value.ccis).subscribe(result=>{
            observer.next(true);
          })
        }else {
          if (this.editMode) {
            this.userService.editUser(this.data.user_id,
              this.myForm.value.role,
              this.myForm.value.active,
              this.myForm.value.ccis,
              this.myForm.value.expiration).subscribe(user => {
              observer.next(true);
            })
          } else {
            this.userService.addUser(
              this.getEmailValue(),
              this.myForm.value.role,
              this.myForm.value.active,
              this.myForm.value.ccis,
              this.myForm.value.expiration).pipe(
              catchError(err => {
                this.errorMessage = err.error;
                observer.next(false);
                return EMPTY;
              })
            ).subscribe((user: User) => {
              observer.next(true);
            })
          }
        }
      }
    })
  }

  getData(): any {
    return {
      ...this.myForm.value,
      refresh:true
    }
  }

  onCountrySelection(event:any){
    const country = environment.entityURL + this.myForm.value.country;
    let params: any = {
      country: country
    }
    this.filterService.getFilter("programs", params).subscribe(result => {
      this.ccis = result.programs;
    });
  }
  addAllCCI(){
    this.myForm.controls['ccis'].reset();
    this.ccis_list = this.ccis.map(x => ({ cci: x.id, label: x.value }));
    this.myForm.patchValue({ ccis: this.ccis.map(y => y.id) });
  }

  addCCI(){
    if (this.myForm.value.cci && this.myForm.value.ccis.findIndex((a:string) => a === this.myForm.value.cci) == -1) {
      this.filterService.getFilter("programs",{qid:environment.entityURL+this.myForm.value.cci}).subscribe(result=>{
        const program = result.programs;
        let ccis = this.myForm.value.ccis;
        ccis.push(this.myForm.value.cci);
        this.myForm.patchValue({
          ccis: ccis
        })
        this.ccis_list.push({
          cci: this.myForm.value.cci,
          label: program.length ? program[0].value : ""
        })
      })
    }
  }

  onClickCci(cci_qid:string){
    if (this.userService.isAdmin()) {
      this.myForm.value.ccis.splice(this.myForm.value.ccis.findIndex((a: string) => a === cci_qid), 1)
      this.ccis_list.splice(this.ccis_list.findIndex((a: any) => a.cci === cci_qid), 1)
    }
  }


}
