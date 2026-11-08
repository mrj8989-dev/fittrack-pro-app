import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from './requires-feature.decorator';
import { Feature, FEATURE_LABEL, minimumPlanFor } from './plan-features';
import { AccessService, AccessUser } from './access.service';

/** Debe ir después de JwtAuthGuard, que es quien pone el usuario en la petición. */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<Feature | undefined>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AccessUser }>();
    if (!user) return false;

    const { enabled, reason } = await this.access.check(user, feature);
    if (enabled) return true;

    if (reason === 'plan') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PLAN_REQUIRED',
        feature,
        requiredPlan: minimumPlanFor(feature),
        message: `Tu plan no incluye ${FEATURE_LABEL[feature]}. Disponible desde el plan ${minimumPlanFor(feature)}.`,
      });
    }
    throw new ForbiddenException({
      statusCode: 403,
      error: 'MODULE_DISABLED',
      feature,
      message: `El módulo de ${FEATURE_LABEL[feature]} no está disponible para tu cuenta.`,
    });
  }
}
