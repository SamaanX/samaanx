import { AdminAnalyticsClient } from "@/features/admin/components/admin-analytics-client";
import { getAdminAnalyticsSummary } from "@/features/admin/queries/dashboard-stats";

export default async function AdminAnalyticsPage() {
  const summary = await getAdminAnalyticsSummary();
  return <AdminAnalyticsClient summary={summary} />;
}
