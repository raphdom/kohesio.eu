import {Expose, Type} from "class-transformer";

export class Edit {

  id!: number;
  qid!: string;
  cci_qid!:string;
  userid!: string;

  @Type(() => Date)
  creation_time?: Date;

  latest_version?: EditVersion;
  language!:string;

  @Type(() => EditVersion)
  edit_versions?: EditVersion[];
  showHistory:boolean = false;
  latest_status!:string;

}

export class EditVersion {

  edit_id!: number;
  cci_qid?: string;
  operation_qid?: string;
  edit_version_id!: number;
  user_id?: string;
  version_comment?: string;
  status?: string;
  label?: string;
  language?:string;
  summary?: string;
  @Type(() => Date)
  creation_time?: Date;

}
