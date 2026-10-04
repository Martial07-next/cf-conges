import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import BugReportButton from "@/components/bugreportbutton";
import OsefBot from "@/components/OsefBot";

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.statutCompte === "DESACTIVE") redirect("/login");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-brand-cream dark:bg-brand-darker">
      <AppShell>{children}</AppShell>
      <BugReportButton />
      <OsefBot />
    </div>
  );
}
