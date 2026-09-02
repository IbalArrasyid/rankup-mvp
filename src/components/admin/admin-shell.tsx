import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/admin-header";

export function AdminShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#090b13] text-slate-100"><AdminHeader /><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">{children}</main></div>;
}
