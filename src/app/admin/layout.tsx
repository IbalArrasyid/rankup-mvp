import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Operations",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
