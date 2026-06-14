import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ user: { name: user.name, email: user.email } });
}
