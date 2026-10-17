import { ALL_SOURCES, runOneSource } from "./launches/run";

// Railway worker entrypoint: an always-on loop, unlike the Vercel cron which
// can only fire once a day on Hobby. Poll interval is independent of Vercel's
// usage quota — this process runs on its own box.
const POLL_INTERVAL_MS = 60_000;

// Each source gets its own independent tick loop instead of one shared loop
// that processes all sources in sequence each tick. A busy source (lots of
// real matches, extra per-log RPC calls for things like tx-sender lookups)
// was eating most of a 60s tick before quieter sources even got their turn,
// so they fell further and further behind — this was observed in practice:
// Pons stayed near the chain tip while Pools.trade's two sources lagged by
// hours. Running sources concurrently means a slow one only slows itself.
async function runSourceLoop(source: (typeof ALL_SOURCES)[number]) {
  while (true) {
    await runOneSource(source);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function main() {
  console.log(
    `Scouts launch indexer starting, ${ALL_SOURCES.length} source(s), polling every ${POLL_INTERVAL_MS / 1000}s each`
  );
  await Promise.all(ALL_SOURCES.map(runSourceLoop));
}

main().catch((err) => {
  console.error("indexer crashed:", err);
  process.exit(1);
});
