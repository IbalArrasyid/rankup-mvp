import { cookies } from "next/headers";
import {
  createOrderAccessToken,
  OrderAccessError,
  orderAccessCookie,
  verifyOrderAccessToken,
} from "@/lib/order-access";

export async function grantOrderAccess(publicId: string): Promise<void> {
  const store = await cookies();
  store.set(orderAccessCookie.name, createOrderAccessToken(publicId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: orderAccessCookie.maxAge,
  });
}

export async function hasOrderAccess(publicId: string): Promise<boolean> {
  const store = await cookies();
  try {
    return verifyOrderAccessToken(store.get(orderAccessCookie.name)?.value, publicId);
  } catch (error) {
    if (error instanceof OrderAccessError) return false;
    throw error;
}
  }
