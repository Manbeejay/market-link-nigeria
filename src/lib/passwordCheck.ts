export async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-1", data);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;

    const text = await res.text();
    return text.split("\n").some((line) => {
      const [lineSuffix, count] = line.trim().split(":");
      return lineSuffix === suffix && Number(count) > 0;
    });
  } catch {
    // If the service is slow or unreachable, let the person continue.
    return false;
  }
}
