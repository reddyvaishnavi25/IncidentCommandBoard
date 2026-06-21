"use server";

import { redirect } from "next/navigation";
import { loginAction, logoutAction } from "@/lib/actions/crisis-actions";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const result = await loginAction(email, password);
  if (result.success) {
    redirect("/command");
  }
  return result;
}

export async function logout() {
  await logoutAction();
  redirect("/login");
}
