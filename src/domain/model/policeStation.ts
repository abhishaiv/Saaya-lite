/** A police or support point parsed from the bundled station asset. */
export interface PoliceStation {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly locality: string;
  readonly areaCovered: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly coordPrecision: string;
  readonly phone: string;
  readonly address: string;
}
