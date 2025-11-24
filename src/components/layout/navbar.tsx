// src/components/layout/navbar.tsx

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import  useAuth  from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Store" },
  { href: "/account/orders", label: "My Orders" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  async function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between gap-4">
        {/* Left: brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            ClothesStore
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  isActive(link.href)
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className={`transition-colors ${
                  isActive("/admin")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right: auth controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                Hi, <span className="font-medium">{user.name}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link href="/login">Login</Link>
              </Button>
              <Button
                size="sm"
                asChild
              >
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
