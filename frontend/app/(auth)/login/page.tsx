"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { authApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting login with:", data.email);
      const response = await authApi.login(data.email, data.password);
      console.log("Login successful");

      // Fetch user data (in production, the login response would include user data)
      // For now, we'll create a basic user object
      // Store tokens immediately so subsequent requests are authenticated
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);

      // Fetch real user data
      console.log("Fetching user profile...");
      const paramUser = await usersApi.getMe();

      console.log("User profile fetched:", paramUser);

      // Update auth store
      login(paramUser, response.access_token, response.refresh_token);
      router.push("/dashboard");
    } catch (err: any) {
      // Log full error to console for debugging
      console.error("Login error:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.response?.data);
      console.error("Error status:", err.response?.status);

      // Handle different error formats from backend
      let errorMessage = "Login failed. Please try again.";

      if (err.response?.data) {
        const detail = err.response.data.detail;

        if (typeof detail === "string") {
          // String error message
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Array of validation errors - show full details
          console.error("Validation errors array:", JSON.stringify(detail, null, 2));
          errorMessage = detail.map((e: any) => {
            const loc = e.loc ? e.loc.join(".") : "field";
            return `${loc}: ${e.msg || JSON.stringify(e)}`;
          }).join("\n");
        } else if (typeof detail === "object" && detail !== null) {
          // Object error - convert to string
          errorMessage = JSON.stringify(detail, null, 2);
        } else if (err.response.data.message) {
          // Alternative message field
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        // Network or other errors
        errorMessage = err.message;
      }

      console.error("Final error message:", errorMessage);
      setError(errorMessage);

      // Show detailed alert
      window.alert("Login Error (Status " + (err.response?.status || "unknown") + "):\n\n" + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to AEGIS
          </CardTitle>
          <CardDescription className="text-center">
            Enter your institute email to login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="yourname@pesce.ac.in"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}