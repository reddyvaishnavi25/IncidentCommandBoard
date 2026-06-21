import { NextResponse } from "next/server";
import { getDemoUsersAction } from "@/lib/actions/crisis-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getDemoUsersAction();
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
