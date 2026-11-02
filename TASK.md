# snap-fit-calc
TypeScript Node CLI (zero runtime deps, MIT, README in English) for plastic cantilever snap-fit design (rectangular constant cross-section beam).
- Inputs: --L beam length mm, --t thickness mm, --b width mm, --E secant modulus MPa, and either --strain allowable strain (decimal, e.g. 0.02) or --y deflection/undercut mm. Optional --alpha insertion angle deg, --alpha2 retention angle deg, --mu friction coefficient (default 0.3).
- Formulas: y = (2/3)*eps*L^2/t ; eps = 1.5*y*t/L^2 ; deflection force P = (b*t^2/6)*E*eps/L ; mating force W = P*(mu+tan(alpha))/(1-mu*tan(alpha)) (error if denominator <= 0, i.e. self-locking); same formula with alpha2 gives separation force.
- Optional --material lookup of typical allowable strain (ABS 0.025, PC 0.04, PA6 dry 0.025, POM 0.06, PP 0.08) used when --strain/--y omitted; warn if given strain exceeds the material value.
- Table and --json output. Validate positive inputs, clear nonzero-exit errors.
- Tests (node:test): L20 t2 b5 E2000 strain0.02 -> y 2.667 mm, P 6.667 N; alpha30 mu0.3 -> W 7.074 N; y 2.6667 -> strain 0.0200; alpha 80 mu 0.3 -> self-locking error or very large force handled; invalid input errors; --json shape.
- npm test must build and pass. .gitignore node_modules/ dist/ *.log. No secrets, no personal info.
