"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function RegisterForm({
  className,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const initialRole = searchParams.get("role") === "provider" ? "PROVIDER" : "CLIENT";
  const [role, setRole] = useState<"CLIENT" | "PROVIDER">(initialRole);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      });
      router.push(
        result.requiresEmailConfirmation
          ? "/login?checkEmail=1"
          : "/dashboard",
      );
    } catch {
      setError("DETAILS DECLINED. CHECK EMAIL AND PASSWORD.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      {error && (
        <div className="border border-oxblood-500/60 bg-oxblood-500/10 px-4 py-3 font-mono text-mono uppercase tracking-[0.2em] text-oxblood-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-0 border border-smoke-700">
        {(["CLIENT", "PROVIDER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "py-3 font-mono text-mono uppercase tracking-[0.32em] transition-colors duration-[250ms] ease-fai-smooth",
              role === r
                ? "bg-bone-100 text-smoke-900"
                : "bg-transparent text-taupe-300 hover:text-bone-100",
            )}
          >
            {r === "CLIENT" ? "Client" : "Professional"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            required
            value={form.firstName}
            onChange={(e) =>
              setForm((f) => ({ ...f, firstName: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            required
            value={form.lastName}
            onChange={(e) =>
              setForm((f) => ({ ...f, lastName: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="8+ characters"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Creating…" : "Open an account →"}
      </Button>
    </form>
  );
}
