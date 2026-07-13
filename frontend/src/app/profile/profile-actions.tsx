'use client';

// Interactive account buttons. These carry onClick handlers, which are not
// allowed inside a Server Component - keeping them in this Client Component
// is what makes the /profile page render instead of crashing.
export function ProfileActions() {
  return (
    <div className="p-4 bg-background/50 rounded-lg border border-border/50">
      <h3 className="font-medium text-foreground mb-3">Account Actions</h3>
      <div className="space-y-3">
        <button
          onClick={() => {
            alert('Edit profile functionality coming soon!');
          }}
          className="w-full text-left px-4 py-2 bg-background/50 hover:bg-primary/10 rounded-lg transition-colors"
        >
          Edit Profile
        </button>
        <button
          onClick={() => {
            alert('Change password functionality coming soon!');
          }}
          className="w-full text-left px-4 py-2 bg-background/50 hover:bg-primary/10 rounded-lg transition-colors"
        >
          Change Password
        </button>
        <button
          onClick={() => {
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
  );
}
