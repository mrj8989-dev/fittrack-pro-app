import { Global, Module } from '@nestjs/common';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { FeatureGuard } from './feature.guard';

/** Global: el FeatureGuard se usa en controladores de muchos módulos. */
@Global()
@Module({
  controllers: [AccessController],
  providers: [AccessService, FeatureGuard],
  exports: [AccessService, FeatureGuard],
})
export class AccessModule {}
