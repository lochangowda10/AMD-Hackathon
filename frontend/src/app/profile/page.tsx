import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileActions } from "./profile-actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  let user: {
    id: string;
    email: string;
    fullName: string;
    image: string | null;
    createdAt: Date;
    _count: { trades: number; journalEntries: number; analyses: number; chatMessages: number };
  } | null = null;

  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            trades: true,
            journalEntries: true,
            analyses: true,
            chatMessages: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Profile load failed:", error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background/95 to-background/90 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Your account information and statistics</p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  {user?.image ? (
                    <img src={user.image} alt="Avatar" className="h-12 w-12 object-cover rounded-full" />
                  ) : (
                    <span className="text-primary text-2xl font-bold">
                      {user?.fullName?.charAt(0) ?? 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{user?.fullName ?? session.user.name ?? 'Trader'}</h2>
                  <p className="text-muted-foreground">{user?.email ?? session.user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Account Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trades:</span>
                    <span className="font-medium">{user?._count.trades ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Journal Entries:</span>
                    <span className="font-medium">{user?._count.journalEntries ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analysis Records:</span>
                    <span className="font-medium">{user?._count.analyses ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chat Messages:</span>
                    <span className="font-medium">{user?._count.chatMessages ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <ProfileActions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
