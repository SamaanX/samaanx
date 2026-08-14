import Link from "next/link";

import { AdminUserAnnouncementForm } from "@/features/admin/components/admin-user-announcement-form";
import { DataTable } from "@/features/admin/components/data-table";

type AdminUserDetailClientProps = {
  user: NonNullable<
    Awaited<
      ReturnType<
        typeof import("@/features/admin/queries/users").getAdminUserDetail
      >
    >
  >;
};

export function AdminUserDetailClient({ user }: AdminUserDetailClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-brand-blue text-sm">
          ← Back to users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{user.displayName}</h1>
        <p className="text-muted-foreground text-sm">{user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Role" value={user.role} />
        <Info label="Status" value={user.status} />
        <Info label="Mode" value={user.preferredMode} />
        <Info label="Verification" value={user.verificationBadge} />
        <Info
          label="Completed rentals"
          value={String(user.completedRentalsCount)}
        />
        <Info label="Avg rating" value={String(user.avgRating)} />
        <Info label="Cancellation rate" value={String(user.cancellationRate)} />
        <Info
          label="Member since"
          value={new Date(user.memberSince).toLocaleDateString()}
        />
      </div>

      <AdminUserAnnouncementForm
        userId={user.id}
        userLabel={user.displayName}
      />

      <Section title="Listings">
        <DataTable
          rows={user.listingsOwned}
          getRowKey={(r) => r.id}
          emptyMessage="No listings."
          columns={[
            { key: "title", header: "Title", render: (r) => r.title },
            { key: "status", header: "Status", render: (r) => r.status },
            {
              key: "mod",
              header: "Moderation",
              render: (r) => r.moderationStatus,
            },
          ]}
        />
      </Section>

      <Section title="Recent reports filed">
        <DataTable
          rows={user.reportsFiled}
          getRowKey={(r) => r.id}
          emptyMessage="No reports."
          columns={[
            { key: "type", header: "Type", render: (r) => r.type },
            { key: "status", header: "Status", render: (r) => r.status },
            {
              key: "date",
              header: "Date",
              render: (r) => new Date(r.createdAt).toLocaleDateString(),
            },
          ]}
        />
      </Section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/70 bg-card rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
