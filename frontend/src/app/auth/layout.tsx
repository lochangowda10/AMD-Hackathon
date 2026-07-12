import "./auth.css";

export const metadata = {
  title: "Authentication - AI Trading Copilot",
  description: "Sign in or create your account",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background/95 to-background/90 p-4">
      <div className="w-full max-w-md space-y-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
}