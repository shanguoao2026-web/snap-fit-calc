#!/usr/bin/env node
import { calculate, type Input } from './calculator.js';
const help = `Usage: snap-fit-calc --L mm --t mm --b mm --E MPa [--strain decimal | --y mm | --material name]

Required: --L beam length, --t thickness, --b width, --E secant modulus
Choose one: --strain allowable strain, --y deflection/undercut
Fallback: --material ABS|PC|"PA6 dry"|POM|PP
Optional: --alpha insertion angle, --alpha2 retention angle (degrees, 0 <= angle < 90)
          --mu nonnegative friction coefficient (default 0.3)
          --json machine-readable output, --help
`;
function main(args: string[]): void {
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) { process.stdout.write(help); return; }
  const input: Record<string, number | string> = {};
  const numeric = new Set(['L', 't', 'b', 'E', 'strain', 'y', 'alpha', 'alpha2', 'mu']);
  const seen = new Set<string>();
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const equal = arg.indexOf('=');
    const key = arg.slice(2, equal < 0 ? undefined : equal);
    if (seen.has(key)) throw new Error(`Duplicate option: --${key}`);
    seen.add(key);
    if (key === 'json' && equal < 0) { json = true; continue; }
    if (!numeric.has(key) && key !== 'material') throw new Error(`Unknown option: --${key}`);
    const value = equal < 0 ? args[++i] : arg.slice(equal + 1);
    if (!value || value.startsWith('--') || !value.trim()) throw new Error(`Missing value for --${key}`);
    if (numeric.has(key)) {
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) throw new Error(`--${key} must be a number`);
      input[key] = Number(value);
    } else input[key] = value;
  }
  const result = calculate(input as unknown as Input);
  for (const warning of result.warnings) process.stderr.write(`Warning: ${warning}\n`);
  if (json) { process.stdout.write(JSON.stringify(result, null, 2) + '\n'); return; }
  const rows: [string, number, string][] = [
    ['Strain', result.strain, 'mm/mm'], ['Deflection', result.deflectionMm, 'mm'],
    ['Deflection force', result.deflectionForceN, 'N'],
  ];
  if (result.matingForceN !== undefined) rows.push(['Mating force', result.matingForceN, 'N']);
  if (result.separationForceN !== undefined) rows.push(['Separation force', result.separationForceN, 'N']);
  console.log('Quantity              Value       Unit');
  console.log('--------------------------------------');
  for (const [label, value, unit] of rows) console.log(`${label.padEnd(21)} ${value.toFixed(label === 'Strain' ? 4 : 3).padStart(10)}  ${unit}`);
}
try { main(process.argv.slice(2)); } catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
