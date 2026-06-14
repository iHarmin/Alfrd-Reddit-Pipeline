import { NextResponse } from "next/server";
import { createAuthResponse, registerUser } from "../../../lib/auth";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  try {
    const user = await registerUser(name, email, password);
    return await createAuthResponse(user);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to register" }, { status: 400 });
  }
}
