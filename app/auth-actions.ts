"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/lpo" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
