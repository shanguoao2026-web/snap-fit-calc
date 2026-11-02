# snap-fit-calc

A TypeScript Node CLI for a plastic cantilever snap-fit with a rectangular,
constant cross-section beam. Zero runtime dependencies. Requires Node.js 22.19+.

```sh
npm install
npm test
npm start -- --L 20 --t 2 --b 5 --E 2000 --strain 0.02 --alpha 30
# Or after npm run build:
node dist/cli.js --L 20 --t 2 --b 5 --E 2000 --y 2.6667 --json
```

The first example reports deflection **2.667 mm**, deflection force **6.667 N**,
and mating force **7.074 N**. Strain is displayed as a decimal, not a percentage.
After installation as a package, the command is `snap-fit-calc`.

| Option | Meaning |
| --- | --- |
| `--L` | Beam length, mm; required, positive |
| `--t` | Beam thickness in the bending direction, mm; required, positive |
| `--b` | Beam width, mm; required, positive |
| `--E` | Secant modulus, MPa (N/mm²); required, positive |
| `--strain` | Allowable strain, decimal (0.02 = 2%); positive |
| `--y` | Deflection/undercut, mm; positive |
| `--material` | Typical allowable strain fallback; case insensitive |
| `--alpha` | Insertion angle in degrees, from 0 inclusive to 90 exclusive |
| `--alpha2` | Retention angle in degrees, same range |
| `--mu` | Friction coefficient, nonnegative; default 0.3 |
| `--json` | Emit full precision JSON instead of the table |
| `--help` | Show usage |

Choose either `--strain` or `--y`. If neither is supplied, `--material` is
required. Supported materials: ABS (0.025), PC (0.04), `"PA6 dry"` (0.025),
POM (0.06), PP (0.08). Quote `"PA6 dry"` in the shell. A specified material
also checks explicit or deflection-derived strain and emits a warning when its
typical value is exceeded. Warnings go to stderr and are included in JSON.
Options accept both `--name value` and `--name=value`.

Calculations (lengths in mm, forces in N):

```text
y = (2/3) × strain × L² / t
strain = 1.5 × y × t / L²
P = (b × t² / 6) × E × strain / L
W = P × (mu + tan(alpha)) / (1 - mu × tan(alpha))
```

The separation force uses the same formula with alpha2. Angles are converted
from degrees to radians. A denominator at or below zero is rejected as
self-locking. Invalid inputs and numeric overflow produce a clear error on
stderr and exit code 1; successful calculations exit 0.

JSON contains `inputs` (including the default mu), `strain`, `deflectionMm`,
`deflectionForceN`, and `warnings` (an array of strings). `matingForceN` and
`separationForceN` appear only when their respective angles are provided.
The table rounds strain to four decimals and other results to three.

The exported `calculate(input)` function in `dist/calculator.js` provides the
same calculation and validation for programmatic use, with TypeScript declarations.

These are idealized beam calculations. Typical material strains are reference
values; grade, temperature, moisture, repeated loading, creep, geometry, and
manufacturing affect actual performance. Validate a design with appropriate
material data and physical testing.

## Development

`npm run build` compiles TypeScript to `dist/`. `npm test` builds and runs the
Node test runner, including CLI integration tests. Tests run without process isolation and capture CLI output in temporary files for compatibility with restricted environments. No runtime packages are used.

## License

MIT; see [LICENSE](LICENSE).
