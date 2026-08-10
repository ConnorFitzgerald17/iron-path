const LOCAL_ORIGIN = "http://localhost:3000";

export function siteUrl(value: string | undefined) {
  const configured = value?.trim();
  if (!configured) return new URL(LOCAL_ORIGIN);

  const absolute = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  try {
    const url = new URL(absolute);
    if (url.protocol !== "http:" && url.protocol !== "https:") return new URL(LOCAL_ORIGIN);
    return new URL(url.origin);
  } catch {
    return new URL(LOCAL_ORIGIN);
  }
}
