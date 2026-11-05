import type { ProfileSummaryView } from '../profiles/profiles.types.js';

/** One row in a followers or following list. */
export interface FollowListItem {
  /** When the follow started. */
  followedAt: Date;
  /** The other user: the follower in a followers list, the followed user in a following list. */
  profile: ProfileSummaryView;
}
