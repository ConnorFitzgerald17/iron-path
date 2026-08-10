import { syncWikiCatalog } from "@/lib/wiki/catalog";

async function main() {
  const counts = await syncWikiCatalog();
  process.stdout.write(`${JSON.stringify({ ok: true, counts })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

export {};
