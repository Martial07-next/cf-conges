export function getSupabaseStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configuration Supabase Storage manquante.");
  }

  return { url, serviceRoleKey };
}

export async function uploadPrivateFile(bucket, path, bytes, contentType) {
  const { url, serviceRoleKey } = getSupabaseStorageConfig();
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: bytes,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase Storage ${response.status}: ${detail}`);
  }
}

export async function createPrivateSignedUrl(bucket, path, expiresIn = 300) {
  const { url, serviceRoleKey } = getSupabaseStorageConfig();
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });

  if (!response.ok) {
    throw new Error(`Supabase Storage signed URL ${response.status}`);
  }

  const data = await response.json();
  const signedPath = data.signedURL || data.signedUrl;
  if (!signedPath) throw new Error("URL signée Supabase absente.");

  return signedPath.startsWith("http") ? signedPath : `${url}/storage/v1${signedPath}`;
}
