const origin = process.env.IRON_PATH_API_ORIGIN ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("CRON_SECRET is required");

const response = await fetch(`${origin}/api/catalog/sync`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
const body = await response.text();
if (!response.ok) throw new Error(`Catalog sync failed (${response.status}): ${body}`);
process.stdout.write(`${body}\n`);

export {};
