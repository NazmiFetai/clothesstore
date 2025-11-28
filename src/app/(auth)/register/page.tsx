// src/app/(auth)/register/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  // We intentionally do NOT let the user choose admin role here.
  // role?: "customer" | "admin";
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name || !email || !password) {
      setFormError("All fields are required.");
      return;
    }

    setSubmitting(true);

    try {
      const body: RegisterBody = {
        name,
        email,
        password,
        // Let backend assign the default client/simple role.
        // If your backend requires a role, you can uncomment and adapt:
        // role: "customer",
      };

      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // success -> go to login with client mode preselected
      router.push("/login?mode=client");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Registration failed. Try again.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Client registration</CardTitle>
          <CardDescription>
            Create a client account to place orders in the shop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create client account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <span>
            Already have an account?{" "}
            <a
              href="/login?mode=client"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Login as client
            </a>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
