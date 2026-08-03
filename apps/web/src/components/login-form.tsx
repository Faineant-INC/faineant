"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { destinationAfterLogin, messageForLoginError } from "@/lib/auth-login";

export function LoginForm({
  className,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const authenticatedUser = await login(email.trim(), password);
      const redirectPath = destinationAfterLogin(
        authenticatedUser.role,
        searchParams.get("redirect"),
      );
      router.push(redirectPath);
      router.refresh();
    } catch (reason) {
      setError(messageForLoginError(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      {searchParams.get("checkEmail") === "1" && !error && (
        <div
          role="status"
          className="border border-champagne-400/60 bg-champagne-400/10 px-4 py-3 font-mono text-mono uppercase tracking-[0.2em] text-champagne-400"
        >
          Check your email, confirm the account, then sign in.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="border border-oxblood-500/60 bg-oxblood-500/10 px-4 py-3 font-mono text-mono uppercase tracking-[0.2em] text-oxblood-400"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in →"}
      </Button>
    </form>
  );
}
