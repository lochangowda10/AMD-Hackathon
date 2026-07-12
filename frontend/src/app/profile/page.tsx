import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Redirect to login if not authenticated
    // This would typically be handled by middleware or in a client component
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          Trade: true,
          JournalEntry: true,
          AnalysisRecord: true,
          ChatMessage: true
        }
      }
    }
  });

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
                  <h2 className="text-xl font-semibold text-foreground">{user?.fullName}</h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Member since {new Date(user?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Account Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trades:</span>
                    <span className="font-medium">{user?._count.Trade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Journal Entries:</span>
                    <span className="font-medium">{user?._count.JournalEntry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analysis Records:</span>
                    <span className="font-medium">{user?._count.AnalysisRecord}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chat Messages:</span>
                    <span className="font-medium">{user?._count.ChatMessage}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <h3 className="font-medium text-foreground mb-3">Account Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // TODO: Implement edit profile functionality
                      alert('Edit profile functionality coming soon!');
                    }}
                    className="w-full text-left px-4 py-2 bg-background/50 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement change password functionality
                      alert('Change password functionality coming soon!');
                    }}
                    className="w-full text-left px-4 py-2 bg-background/50 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement delete account functionality with confirmation
                      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        alert('Delete account functionality coming soon!');
                      }
                    }}
                    className="w-full text-left px-4 py-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors text-destructive"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}