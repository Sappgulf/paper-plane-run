import { buildJourneyRouteMatrix, DEFAULT_ROUTE_PROOF_SEED } from '../src/game/route-proof.js'

const args = new URLSearchParams(process.argv.slice(2).join('&'))
const seed = Number(args.get('seed') || DEFAULT_ROUTE_PROOF_SEED)
const difficulty = args.get('difficulty') || 'normal'
const proofs = buildJourneyRouteMatrix({ seeds: [seed], difficultyId: difficulty })
const summary = {
  seed,
  difficulty,
  routes: proofs.length,
  passed: proofs.filter((proof) => proof.allChecksPass).length,
  failed: proofs.filter((proof) => !proof.allChecksPass).map((proof) => ({
    routeId: proof.routeId,
    checks: proof.checks,
  })),
  fingerprints: proofs.map((proof) => ({
    routeId: proof.routeId,
    fingerprint: proof.fingerprint,
  })),
}

console.log(JSON.stringify(summary, null, 2))
if (summary.failed.length) process.exitCode = 1
