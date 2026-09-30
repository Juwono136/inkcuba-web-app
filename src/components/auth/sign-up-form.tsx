"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { siteConfig } from "@/config/site";
import {
  BINUS_CAMPUSES,
  generateDefaultAvatarUrl,
} from "@/lib/auth/constants";
import { signUp } from "@/lib/auth/client";
import { signUpSchema } from "@/lib/validators/auth";

export function SignUpForm() {
  const router = useRouter();
  const isSubmittingRef = useRef(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [binusianId, setBinusianId] = useState("");
  const [campus, setCampus] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (isSubmittingRef.current) return;

    setErrors({});

    const parsed = signUpSchema.safeParse({
      name,
      email,
      binusianId,
      campus: campus || undefined,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const result = await signUp.email({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        image: generateDefaultAvatarUrl(),
        campus: parsed.data.campus,
        // Self-registration is always STUDENT — store BINUSIAN ID as NIM
        nim: parsed.data.binusianId,
        callbackURL: "/auth/sign-in",
      });

      if (result.error) {
        toast.error(result.error.message ?? "Registration failed.");
        return;
      }

      toast.success(
        "Account created! Check your BINUS email to verify before signing in.",
      );
      router.push(`${siteConfig.links.signIn}?registered=1`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <InkcubaLoader fullScreen label="Creating your account..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? (
          <p className="text-xs text-red-500">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">BINUS Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="name@binus.edu or name@binus.ac.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-xs text-red-500">{errors.email}</p>
        ) : (
          <p className="text-xs text-slate-500">
            New accounts start as Student. You must verify this email before
            signing in.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="binusianId">BINUSIAN ID</Label>
        <Input
          id="binusianId"
          placeholder="e.g. 2602145123"
          value={binusianId}
          onChange={(e) => setBinusianId(e.target.value)}
          aria-invalid={Boolean(errors.binusianId)}
        />
        {errors.binusianId ? (
          <p className="text-xs text-red-500">{errors.binusianId}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Campus</Label>
        <Select value={campus} onValueChange={setCampus}>
          <SelectTrigger className="w-full" aria-invalid={Boolean(errors.campus)}>
            <SelectValue placeholder="Select your campus" />
          </SelectTrigger>
          <SelectContent>
            {BINUS_CAMPUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.campus ? (
          <p className="text-xs text-red-500">{errors.campus}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          placeholder="Min. 8 chars with upper, lower & number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
        />
        <PasswordRequirements password={password} />
        {errors.password ? (
          <p className="text-xs text-red-500">{errors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={Boolean(errors.confirmPassword)}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-red-500">{errors.confirmPassword}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 hover:shadow-inkcuba-hover"
        size="lg"
      >
        Create Account
      </Button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href={siteConfig.links.signIn}
          className="font-semibold text-sky-600 hover:underline"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}
