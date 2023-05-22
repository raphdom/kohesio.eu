import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards
} from "@nestjs/common";
import {UserService} from "./user.service";
import {UserDTO} from "./dtos/user.dto";
import {plainToInstance} from "class-transformer";
import {Role, UserInDto} from "./dtos/user.in.dto";
import {Roles} from "../auth/roles.decorator";
import {RolesGuard} from "../auth/roles.guard";
import {
  ApiBadRequestResponse, ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags, refs
} from "@nestjs/swagger";
import {BaseController} from "../base.controller";

@Controller('/users')
@ApiTags('Users')
export class UserController extends BaseController{

  constructor(private userService: UserService){
    super();
  }

  @ApiOkResponse({
    schema: {
      anyOf: refs(
        UserDTO,
        Object
      ),
    },
  })
  @Get('/currentUser')
  async user(@Req() req): Promise<UserDTO | Object> {
    if (req.user){
      return plainToInstance(UserDTO, req.user as Object);
    }else{
      return {};
    }
  }
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiForbiddenResponse({description: "You don't have access to this operation"})
  @ApiServiceUnavailableResponse({description: "Service is unavailable"})
  @ApiOkResponse({
    type:[UserDTO]
  })
  @Get('')
  async users(@Req() req) : Promise<UserDTO[] | void>{
    return await this.userService.getUsersList(req.user.user_id).catch(this.errorHandler);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({
    type:UserDTO
  })
  @ApiBadRequestResponse({description: "The user already exists"})
  @ApiServiceUnavailableResponse({description: "Service is unavailable"})
  @ApiForbiddenResponse({description: "You don't have access to this operation"})
  @Post('')
  async addUser(@Req() req, @Body() userDTO: UserInDto): Promise<UserDTO | void>{
    return await this.userService.addUser(req.user.user_id,userDTO).catch(this.errorHandler);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponse({
    type:UserDTO
  })
  @ApiForbiddenResponse({description: "You don't have access to this operation"})
  @ApiServiceUnavailableResponse({description: "Service is unavailable"})
  @Put('/:id')
  async editUser(@Req() req,@Body() userDTO: UserInDto, @Param('id') id: string): Promise<UserDTO | void>{
    userDTO.userid = id;
    return await this.userService.editUser(req.user.user_id,userDTO).catch(this.errorHandler);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponse({
    type:Boolean
  })
  @ApiForbiddenResponse({description: "You don't have access to this operation"})
  @ApiServiceUnavailableResponse({description: "Service is unavailable"})
  @Delete('/:id')
  async deleteUser(@Req() req,@Param('id') id: string):Promise<boolean | void>{
    return await this.userService.deleteUser(req.user.user_id,id).catch(this.errorHandler);
  }

}
