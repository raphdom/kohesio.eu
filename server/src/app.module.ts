import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import {QueryModule} from "./queries/query.module";
import {DraftModule} from "./drafts/draft.module";
import {EditModule} from "./edits/edit.module";
import {BeneficiaryModule} from "./beneficiaries/beneficiary.module";
import {ProjectModule} from "./projects/project.module";
import {MapModule} from "./map/map.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UserModule,
    QueryModule,
    DraftModule,
    EditModule,
    BeneficiaryModule,
    ProjectModule,
    MapModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
