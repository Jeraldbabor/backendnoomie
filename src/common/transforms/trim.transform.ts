import { Transform } from 'class-transformer';

/** Trims surrounding whitespace from string inputs before validation runs. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
