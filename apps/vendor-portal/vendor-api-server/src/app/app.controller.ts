import { Body, Controller, Get, Post } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsString } from "class-validator";
import { AppService } from "./app.service";

class EchoPayloadDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  age!: number;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post("echo")
  echo(@Body() payload: EchoPayloadDto) {
    return payload;
  }
}
