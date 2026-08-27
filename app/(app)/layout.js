import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import BugReportButton from "@/components/bugreportbutton";

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.statutCompte === "DESACTIVE") redirect("/login");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-brand-cream">
      <Sidebar />
      <BugReportButton />
      <main className="flex-1 min-w-0 px-4 py-5 md:px-10 md:py-10 md:ml-64">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
