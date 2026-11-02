/** Typical allowable strains; actual grades and service conditions vary. */
export const materials: Readonly<Record<string, number>> = Object.freeze({
  ABS: 0.025, PC: 0.04, 'PA6 dry': 0.025, POM: 0.06, PP: 0.08,
});
export interface Input {
  L: number; t: number; b: number; E: number;
  strain?: number; y?: number; alpha?: number; alpha2?: number; mu?: number; material?: string;
}
export interface Result {
  inputs: Input & { mu: number };
  strain: number;
  deflectionMm: number;
  deflectionForceN: number;
  matingForceN?: number;
  separationForceN?: number;
  warnings: string[];
}
function positive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a finite positive number`);
}
export function calculate(input: Input): Result {
  for (const name of ['L', 't', 'b', 'E'] as const) positive(name, input[name]);
  const mu = input.mu ?? 0.3;
  if (!Number.isFinite(mu) || mu < 0) throw new Error('mu must be a finite nonnegative number');
  if (input.strain !== undefined && input.y !== undefined) throw new Error('Specify either --strain or --y, not both');
  let material: string | undefined;
  if (input.material !== undefined) {
    material = Object.keys(materials).find(key => key.toLowerCase() === input.material!.trim().toLowerCase());
    if (!material) throw new Error(`Unknown material: ${input.material}. Choose ABS, PC, "PA6 dry", POM, or PP`);
  }
  if (input.strain !== undefined) positive('strain', input.strain);
  if (input.y !== undefined) positive('y', input.y);
  const strain = input.strain ?? (input.y !== undefined ? 1.5 * input.y * input.t / input.L ** 2 : material ? materials[material] : undefined);
  if (strain === undefined) throw new Error('Provide --strain, --y, or --material');
  positive('Calculated strain', strain);
  const deflectionMm = input.y ?? (2 / 3) * strain * input.L ** 2 / input.t;
  const deflectionForceN = (input.b * input.t ** 2 / 6) * input.E * strain / input.L;
  positive('Calculated deflection', deflectionMm);
  positive('Calculated deflection force', deflectionForceN);
  const warnings: string[] = [];
  if (material && strain > materials[material]!) warnings.push(`Strain ${strain} exceeds typical allowable strain ${materials[material]} for ${material}`);
  const result: Result = { inputs: { ...input, ...(material ? { material } : {}), mu }, strain, deflectionMm, deflectionForceN, warnings };
  function force(angle: number, name: string): number {
    if (!Number.isFinite(angle) || angle < 0 || angle >= 90) throw new Error(`${name} must be in the range 0 <= angle < 90 degrees`);
    const tangent = Math.tan(angle * Math.PI / 180);
    const denominator = 1 - mu * tangent;
    if (denominator <= 0) throw new Error(`${name}: self-locking (1 - mu * tan(angle) <= 0)`);
    const value = deflectionForceN * (mu + tangent) / denominator;
    if (!Number.isFinite(value)) throw new Error(`${name}: calculated force exceeds numeric range`);
    return value;
  }
  if (input.alpha !== undefined) result.matingForceN = force(input.alpha, 'alpha');
  if (input.alpha2 !== undefined) result.separationForceN = force(input.alpha2, 'alpha2');
  return result;
}
