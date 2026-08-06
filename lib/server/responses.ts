import { NextResponse } from "next/server";

export const unauthorized = () => NextResponse.json({ error: "invalid_device_token" }, { status: 401 });
export const badRequest = (message: string) => NextResponse.json({ error: "invalid_request", message }, { status: 400 });
export const unavailable = () => NextResponse.json({ error: "supabase_not_configured", demoToken: "demo-device-token" }, { status: 503 });
