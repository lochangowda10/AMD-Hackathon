'use client';

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  const router = useRouter();

  const handleBackToLogin = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background/95 to-background/90 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <span className="text-destructive">⚠️</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground">
          We couldn't process your request. Please try again or contact support if the issue persists.
        </p>
        <Button
          variant="outline"
          onClick={handleBackToLogin}
          className="w-full"
        >
          Back to Login
        </Button>
      </div>
    </div>
  );
}