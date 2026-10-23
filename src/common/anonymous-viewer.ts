/**
 * Stands in for the viewer's user id on public reads without a token. User ids are UUIDv7,
 * never the nil UUID, so viewer-specific lookups (savedByMe, followedByMe) match nothing.
 */
export const ANONYMOUS_VIEWER = '00000000-0000-0000-0000-000000000000';
