'use client';

import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { SignOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  return (
    <>
      {/* Loading spinner */}
      {status === "loading" && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 border-2 border-primary rounded-full animate-spin"></div>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {/* User dropdown when authenticated */}
      {status === "authenticated" && session?.user && (
        <div className="fixed bottom-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-3">
              <button className="hover:bg-primary/10 rounded-md p-2 transition-colors">
                <Menu className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </button>
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session.user.image || "/default-avatar.png"}
                    alt={session.user.name}
                  />
                  <AvatarFallback>
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <div className="font-medium text-foreground">{session.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {session.user.email?.split("@")[0]}
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-2 bg-popover border border-popover">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/")}>
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
              }}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Main content with error boundary and toaster */}
      <ErrorBoundary>
        <main className="min-h-screen">
          {children}
        </main>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}