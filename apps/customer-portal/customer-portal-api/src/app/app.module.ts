import { Module } from '@nestjs/common';
import { EthioConnectApiCommonModule } from '@ethio-connect/api-common';
import { EthioConnectApiFeaturesModule } from '@ethio-connect/api-features';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [EthioConnectApiCommonModule, EthioConnectApiFeaturesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
