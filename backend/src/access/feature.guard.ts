import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, SubscriptionPlan } from '@prisma/client';
import { FEATURE_KEY } from './requires-feature.decorator';
import {
  Feature,
  FEATURE_LABEL,
  hasFeature,
  minimumPlanFor,
} from './plan-features';

/** Debe ir después de JwtAuthGuard, que es quien pone el usuario en la petición. */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<Feature | undefined>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const { user } = context.switchToHttp().getRequest<{
      user?: { role: Role; subscriptionPlan: SubscriptionPlan };
    }>();
    if (!user) return false;
    if (hasFeature(user, feature)) return true;

    throw new ForbiddenException({
      statusCode: 403,
      error: 'PLAN_REQUIRED',
      feature,
      requiredPlan: minimumPlanFor(feature),
      message: `Tu plan no incluye ${FEATURE_LABEL[feature]}. Disponible desde el plan ${minimumPlanFor(feature)}.`,
    });
  }
}
