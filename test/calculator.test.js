import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculate, materials } from '../dist/calculator.js';
const base = { L: 20, t: 2, b: 5, E: 2000, strain: 0.02 };
const near = (actual, expected, tolerance = 0.001) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const cli = (...args) => {
  const dir = mkdtempSync(join(tmpdir(), 'snap-fit-'));
  const out = join(dir, 'out'); const err = join(dir, 'err');
  const stdout = openSync(out, 'w'); const stderr = openSync(err, 'w');
  try {
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args], { stdio: ['ignore', stdout, stderr] });
    if (result.error) throw result.error;
    return { status: result.status, stdout: readFileSync(out, 'utf8'), stderr: readFileSync(err, 'utf8') };
  } finally {
    closeSync(stdout); closeSync(stderr); rmSync(dir, { recursive: true, force: true });
  }
};
const flags = ['--L', '20', '--t', '2', '--b', '5', '--E', '2000'];
test('reference beam and insertion/separation forces', () => {
  const r = calculate({ ...base, alpha: 30, alpha2: 30 });
  near(r.deflectionMm, 2.667); near(r.deflectionForceN, 6.667);
  near(r.matingForceN, 7.074); near(r.separationForceN, 7.074);
});
test('deflection input recovers strain', () => {
  const { strain, ...rest } = base;
  near(calculate({ ...rest, y: 2.6667 }).strain, 0.02, 0.000001);
});
test('material defaults and warnings including deflection-derived strain', () => {
  const { strain, ...rest } = base;
  for (const [material, expected] of Object.entries(materials)) assert.equal(calculate({ ...rest, material }).strain, expected);
  assert.equal(calculate({ ...base, material: 'abs', strain: 0.03 }).warnings.length, 1);
  assert.equal(calculate({ ...rest, material: 'ABS', y: 10 }).warnings.length, 1);
});
test('self-locking and invalid numerical inputs', () => {
  assert.throws(() => calculate({ ...base, alpha: 80 }), /self-locking/);
  assert.throws(() => calculate({ ...base, alpha2: 80 }), /self-locking/);
  for (const key of ['L', 't', 'b', 'E', 'strain']) for (const value of [0, -1, NaN, Infinity]) assert.throws(() => calculate({ ...base, [key]: value }));
  for (const extra of [{ y: 1 }, { mu: -1 }, { alpha: 90 }, { alpha: -1 }, { material: 'unknown' }]) assert.throws(() => calculate({ ...base, ...extra }));
  assert.throws(() => calculate({ L: 20, t: 2, b: 5, E: 2000 }), /Provide/);
  assert.equal(calculate({ ...base, mu: 0, alpha: 0 }).matingForceN, 0);
});
test('CLI JSON shape, precision, and table', () => {
  const p = cli(...flags, '--strain', '0.02', '--alpha', '30', '--json');
  assert.equal(p.status, 0, p.stderr);
  const r = JSON.parse(p.stdout);
  assert.deepEqual(Object.keys(r).sort(), ['inputs', 'strain', 'deflectionMm', 'deflectionForceN', 'matingForceN', 'warnings'].sort());
  assert.equal(r.inputs.mu, 0.3); assert.deepEqual(r.warnings, []);
  near(r.deflectionMm, 8 / 3, 1e-12);
  assert.match(cli(...flags, '--strain=0.02').stdout, /2\.667/);
  assert.match(cli(...flags, '--y', '2.6667').stdout, /0\.0200/);
});
test('CLI errors exit nonzero with clear messages', () => {
  for (const args of [[], ['--strain', 'abc'], ['--strain', '0'], ['--strain', '0.02', '--y', '1'], ['--oops'], ['--strain'], ['--strain', '0.02', '--alpha', '80'], ['--L', '3'], ['--json=true']]) {
    const p = cli(...flags, ...args);
    assert.equal(p.status, 1); assert.match(p.stderr, /Error:/); assert.equal(p.stdout, '');
  }
});
test('CLI material warning preserves JSON and help works', () => {
  const p = cli(...flags, '--strain', '0.04', '--material', 'ABS', '--json');
  assert.equal(p.status, 0); assert.match(p.stderr, /Warning:/); assert.equal(JSON.parse(p.stdout).warnings.length, 1);
  assert.equal(cli('--help').status, 0);
});
