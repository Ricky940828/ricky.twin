interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

function parseVersion(value: string): ParsedVersion {
  const normalized = value.trim();
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(
    normalized,
  );
  if (!match) {
    throw new Error(`版本号格式无效：${value}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

export function normalizeVersion(value: string) {
  const parsed = parseVersion(value);
  const base = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  return parsed.prerelease.length > 0
    ? `${base}-${parsed.prerelease.join(".")}`
    : base;
}

function compareIdentifier(left: string, right: string) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }
  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1;
  }
  return left.localeCompare(right);
}

export function compareVersions(left: string, right: string) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) {
      return a[key] - b[key];
    }
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    if (a.prerelease.length === b.prerelease.length) {
      return 0;
    }
    return a.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const aPart = a.prerelease[index];
    const bPart = b.prerelease[index];
    if (aPart === undefined || bPart === undefined) {
      return aPart === bPart ? 0 : aPart === undefined ? -1 : 1;
    }
    const result = compareIdentifier(aPart, bPart);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}

