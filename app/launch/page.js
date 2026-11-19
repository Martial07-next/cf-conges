import LaunchClient from "@/components/LaunchClient";
import EcranChargement from "@/components/EcranChargement";

export const dynamic = "force-static";

export default function LaunchPage() {
  return (
    <main>
      <LaunchClient />
      <EcranChargement style={{ zIndex: 99998 }} />
    </main>
  );
}
