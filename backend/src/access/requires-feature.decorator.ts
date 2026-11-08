import { SetMetadata } from '@nestjs/common';
import { Feature } from './plan-features';

export const FEATURE_KEY = 'requiredFeature';

/** Restringe el endpoint (o el controlador) a clientes cuyo plan incluya la funcionalidad. */
export const RequiresFeature = (feature: Feature) =>
  SetMetadata(FEATURE_KEY, feature);
