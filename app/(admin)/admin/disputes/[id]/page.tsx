import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminDisputeDetail } from "@/features/admin/queries/disputes";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dispute = await getAdminDisputeDetail(id);
  if (!dispute) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/disputes" className="text-brand-blue text-sm">
        ← Back to disputes
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {dispute.rental.listing.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          Status: {dispute.status}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Buyer statement" body={dispute.buyerStatement} />
        <Panel title="Seller statement" body={dispute.sellerStatement} />
        <Panel title="Admin notes" body={dispute.adminNotes} />
        <Panel title="Resolution" body={dispute.resolution} />
      </div>
      <section>
        <h2 className="mb-3 font-semibold">Chat history</h2>
        <ul className="border-border/70 bg-card space-y-2 rounded-xl border p-4 text-sm">
          {dispute.rental.conversation?.messages.map((m) => (
            <li
              key={m.id}
              className="border-border/40 border-b pb-2 last:border-0"
            >
              <span className="font-medium">{m.sender.displayName}: </span>
              {m.body || "(attachment)"}
              <span className="text-muted-foreground ml-2 text-xs">
                {new Date(m.createdAt).toLocaleString()}
              </span>
            </li>
          )) ?? <li className="text-muted-foreground">No messages.</li>}
        </ul>
      </section>
    </div>
  );
}

function Panel({
  title,
  body,
}: {
  title: string;
  body: string | null | undefined;
}) {
  return (
    <div className="border-border/70 bg-card rounded-xl border p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm">{body ?? "—"}</p>
    </div>
  );
}
