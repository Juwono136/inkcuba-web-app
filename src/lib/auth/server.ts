import "server-only";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth/auth";

export async function getServerSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function requireServerSession() {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}
