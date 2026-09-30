/**
 * Turn raw socket IPs into short, human-friendly labels for Login History.
 * Never dump opaque IPv6 blobs that confuse non-technical users.
 */
export type FriendlyIp = {
  label: string;
  detail?: string;
};

function normalizeIp(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function isAllZeroIpv6(ip: string): boolean {
  const compacted = ip.replace(/:/g, "");
  return compacted.length > 0 && /^[0f]*$/i.test(compacted.replace(/ffff/gi, ""));
}

function extractMappedIpv4(ip: string): string | null {
  // ::ffff:192.168.1.1 or ::ffff:c0a8:0101
  const dotted = ip.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (dotted?.[1]) return dotted[1];

  const hex = ip.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex?.[1] && hex[2]) {
    const hi = Number.parseInt(hex[1], 16);
    const lo = Number.parseInt(hex[2], 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    }
  }

  return null;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  return false;
}

export function formatIpAddressForDisplay(
  ipAddress: string | null | undefined,
): FriendlyIp {
  if (!ipAddress?.trim()) {
    return { label: "Location unavailable" };
  }

  const raw = normalizeIp(ipAddress);

  if (
    raw === "::" ||
    raw === "::1" ||
    raw === "0.0.0.0" ||
    raw === "127.0.0.1" ||
    raw === "localhost" ||
    /^0+(\.0+){3}$/.test(raw)
  ) {
    return { label: "This computer (local)" };
  }

  // Broken / zero-padded IPv6 blobs (e.g. 0000:...:ffff:0000:0000)
  if (raw.includes(":")) {
    const mapped = extractMappedIpv4(raw);
    if (mapped) {
      if (mapped === "0.0.0.0" || mapped === "127.0.0.1") {
        return { label: "This computer (local)" };
      }
      if (isPrivateIpv4(mapped)) {
        return { label: "Private network", detail: mapped };
      }
      return { label: "Network connection", detail: mapped };
    }

    // Expanded IPv4-mapped form: ...:ffff:0000:0000 or ...:ffff:c0a8:0001
    const expanded = raw.match(/:ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (expanded?.[1] && expanded[2]) {
      const hi = Number.parseInt(expanded[1], 16);
      const lo = Number.parseInt(expanded[2], 16);
      if (Number.isFinite(hi) && Number.isFinite(lo)) {
        const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        if (ipv4 === "0.0.0.0" || ipv4 === "127.0.0.1") {
          return { label: "This computer (local)" };
        }
        if (isPrivateIpv4(ipv4)) {
          return { label: "Private network", detail: ipv4 };
        }
        return { label: "Network connection", detail: ipv4 };
      }
    }

    if (isAllZeroIpv6(raw) || /:ffff:(0{1,4}:){0,1}0{1,4}$/i.test(raw)) {
      return { label: "Location unavailable" };
    }

    if (raw.startsWith("fe80:")) {
      return { label: "Local network (IPv6)" };
    }
    if (raw.startsWith("fc") || raw.startsWith("fd")) {
      return { label: "Private network (IPv6)" };
    }
    return { label: "Network connection (IPv6)" };
  }

  // Plain IPv4
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(raw)) {
    if (isPrivateIpv4(raw)) {
      return { label: "Private network", detail: raw };
    }
    return { label: "Network connection", detail: raw };
  }

  return { label: "Location unavailable" };
}
