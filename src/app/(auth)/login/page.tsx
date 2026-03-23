"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-11 text-base" loading={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export default function LoginPage() {
  const [error, formAction] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-primary px-4">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/5" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-surface-secondary overflow-hidden">

          {/* Header stripe */}
          <div className="bg-primary px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Victory Coffee</h1>
                <p className="text-primary-20 text-xs">Factory Management System</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-deepest">Sign in to your account</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the system</p>
            </div>

            <form action={formAction} className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-warning/10 border border-warning/20 px-4 py-3">
                  <p className="text-sm text-warning font-medium">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@victorycoffee.ug"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <SubmitButton />
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Victory Coffee Factory — Lwengo, Uganda
        </p>
      </div>
    </main>
  );
}
