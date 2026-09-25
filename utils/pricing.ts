import { IPlace, ShipmentDirection } from '../models/Shipment';
import AppError from './AppError';
export const NIGERIA_CODE = 'NG';
export const isNigeria = (place: IPlace): boolean =>
  place.countryCode === NIGERIA_CODE;
const LOCAL_KOBO = 850_000;
const INTERNATIONAL_RATES_KOBO: Record<string, number> = {
  GH: 4_500_000,
  GB: 8_500_000,
  US: 9_500_000,
  CA: 9_500_000,
  AE: 9_000_000,
};
export const DEFAULT_INTERNATIONAL_KOBO = 8_000_000;
export const estimateAmount = (
  pickUp: IPlace,
  deliveryTo: IPlace,
): number => {
  const direction = deriveDirection(pickUp, deliveryTo);
  if (direction === 'local') return LOCAL_KOBO;
  const abroad = isNigeria(pickUp) ? deliveryTo : pickUp;
  return INTERNATIONAL_RATES_KOBO[abroad.countryCode] ?? DEFAULT_INTERNATIONAL_KOBO;
};
export const deriveDirection = (
  pickUp: IPlace,
  deliveryTo: IPlace,
): ShipmentDirection => {
  const fromNG = isNigeria(pickUp);
  const toNG = isNigeria(deliveryTo);
  if (fromNG && toNG) return 'local';
  if (fromNG) return 'export';
  if (toNG) return 'import';
  throw new AppError('Shipments must start or end in Nigeria', 400);
};
interface IPlaceInput {
  name?: unknown;
  countryCode?: unknown;
}
const PLACE_CODE_PATTERN = /^[A-Za-z]{2}$/;
export const parsePlace = (value: unknown, label: string): IPlace => {
  const place = value as IPlaceInput | null;
  const name = typeof place?.name === 'string' ? place.name.trim() : '';
  const countryCode =
    typeof place?.countryCode === 'string'
      ? place.countryCode.trim().toUpperCase()
      : '';
  if (!name || name.length > 120) {
    throw new AppError(`Please provide the ${label} location`, 400);
  }
  if (!PLACE_CODE_PATTERN.test(countryCode)) {
    throw new AppError(`Please provide a valid country for ${label}`, 400);
  }
  return { name, countryCode };
};