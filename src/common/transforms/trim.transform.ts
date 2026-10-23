import { Transform } from 'class-transformer';

/**
 * Trims surrounding whitespace from string inputs before validation runs. On a list, trims
 * each string in it.
 */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => {
    const trim = (item: unknown) =>
      typeof item === 'string' ? item.trim() : item;
    return Array.isArray(value) ? value.map(trim) : trim(value);
  });
