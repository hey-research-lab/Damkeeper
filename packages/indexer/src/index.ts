import { runLaunchIndexer } from "./launches/run";

// Railway worker entrypoint: an always-on loop, unlike the Vercel cron which
// can only fire once a day on Hobby. Poll interval is independent of Vercel's
// usage quota — this process runs on its own box.
const POLL_INTERVAL_MS = 60_000;

async function tick() {
  await runLaunchIndexer();
}

async function main() {
  console.log(`Scouts launch indexer starting, polling every ${POLL_INTERVAL_MS / 1000}s`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("indexer crashed:", err);
  process.exit(1);
});
