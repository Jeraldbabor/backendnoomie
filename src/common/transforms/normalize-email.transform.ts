import { Transform } from 'class-transformer';

/** Trims and lowercases emails so lookups and uniqueness are case-insensitive. */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
