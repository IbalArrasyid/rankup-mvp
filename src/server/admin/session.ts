import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminSessionCookie,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
};

export async function createAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(adminSessionCookie.name, createAdminSessionToken(), {
    ...cookieOptions,
    maxAge: adminSessionCookie.maxAge,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(adminSessionCookie.name, "", { ...cookieOptions, maxAge: 0 });
}

export async function hasAdminSession(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminSessionToken(store.get(adminSessionCookie.name)?.value);
}

export async function requireAdminSession(): Promise<void> {
  if (!(await hasAdminSession())) redirect("/admin/login");
}
