import { avatarNoel } from "@/lib/avatarNoel";

// Pingouin posé par-dessus les initiales d'un collaborateur. Visible
// uniquement avec l'apparence Noël (classe « noel » sur <html>, globals.css) ;
// le parent doit être « relative overflow-hidden » et rond.
export default function AvatarNoel({ id, prenom, nom, nomComplet }) {
  if (!id) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarNoel(id, prenom, nom, nomComplet)} alt="" aria-hidden loading="lazy" decoding="async" className="cf-avatar-noel" />
  );
}
