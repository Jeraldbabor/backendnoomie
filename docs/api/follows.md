# Follows and feed

Signed-in users can follow other users. Their **feed** shows the newest recipes by the people
they follow. Who follows whom is public: anyone can see a user's followers and who they
follow.

How to call these from the Noomie app: [app integration](../app-integration/noomie-app.md#follows-and-the-feed-in-the-app).

## Endpoints

| Method | Path                                 | Who       | Success |
| ------ | ------------------------------------ | --------- | ------- |
| PUT    | `/api/v1/profiles/:userId/follow`    | Signed in | 204     |
| DELETE | `/api/v1/profiles/:userId/follow`    | Signed in | 204     |
| GET    | `/api/v1/profiles/:userId/followers` | Anyone    | 200     |
| GET    | `/api/v1/profiles/:userId/following` | Anyone    | 200     |
| GET    | `/api/v1/feed`                       | Signed in | 200     |

Profiles also show follow counts and whether you follow them; see
[profiles](profiles.md#the-profile-object).

## Follow someone: `PUT /api/v1/profiles/:userId/follow` (signed in)

No body. Returns **204**. Following someone you already follow also returns **204** and
changes nothing, so it's safe to call on every tap.

- **400** `You can't follow yourself`.
- **404** `Profile not found` if there is no such user.
- **400** `Validation failed (uuid is expected)` if the ID isn't a valid UUID.

## Unfollow: `DELETE /api/v1/profiles/:userId/follow` (signed in)

No body. Returns **204**, also when you weren't following them.

## Followers and following

`GET /api/v1/profiles/:userId/followers` lists who follows the user.
`GET /api/v1/profiles/:userId/following` lists who the user follows. Both are public; send
the token when signed in to get `followedByMe` for each person.

They page like other lists (`?limit=` 1–50, default 20, and `?cursor=`; see
[paging](conventions.md#lists-and-paging)), most recent follow first:

```json
{
  "data": [
    {
      "followedAt": "2026-10-23T07:29:24.090Z",
      "profile": {
        "id": "01a167aa-191e-73df-8561-6cc34e5ff6fc",
        "displayName": "Ben",
        "photo": null,
        "followedByMe": true
      }
    }
  ],
  "nextCursor": null
}
```

- **`followedAt`** is when that follow started.
- **`profile`** is the other person: the follower in a followers list, the followed user in
  a following list. It has their `photo` ([photo object](photos.md#the-photo-object) or
  `null`) and **`followedByMe`**: whether the signed-in viewer follows them, for a Follow
  button on each row. It's always `false` without a token, and for yourself.
- For the full profile (bio, counts), load `GET /api/v1/profiles/:userId`.
- **404** `Profile not found` if the user doesn't exist.

## Your feed: `GET /api/v1/feed` (signed in)

Recipes by the people you follow, newest first. Your own recipes aren't in it. Pages like
other lists (`?limit=`, `?cursor=`). Each item is a recipe as in other lists, the
[recipe object](recipes.md#the-recipe-object) [without `steps`](recipes.md#in-lists-recipes-have-no-steps),
with `savedByMe`:

```json
{
  "data": [
    {
      "id": "01a167aa-1a8c-74b9-966b-cd9fb00d3aa8",
      "title": "Garlic butter noodles",
      "description": null,
      "cuisine": "Italian-inspired",
      "minutes": 15,
      "servings": 2,
      "ingredients": [
        { "name": "spaghetti", "quantity": 200, "unit": "g", "note": null }
      ],
      "createdAt": "2026-10-23T07:29:23.596Z",
      "updatedAt": "2026-10-23T07:29:23.596Z",
      "photo": null,
      "author": {
        "id": "01a167aa-191e-73df-8561-6cc34e5ff6fc",
        "displayName": "Ben",
        "photo": null
      },
      "savedByMe": false
    }
  ],
  "nextCursor": null
}
```

When the user follows nobody, or the people they follow haven't posted, the feed is
`{ "data": [], "nextCursor": null }`: a normal empty state, a good place to suggest recipes
or people to follow. After unfollowing someone, their recipes leave the feed.

## When accounts are deleted

Deleting an account removes all its follows, both ways: it leaves the lists of the people it
followed and the people who followed it, and their counts go down.

## Errors

| Status | When                                                                                       | Message                                |
| ------ | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| 401    | Follow, unfollow, or feed without a session, or an invalid token on any of these endpoints | `Sign in to continue`                  |
| 400    | Following yourself                                                                         | `You can't follow yourself`            |
| 404    | The user doesn't exist                                                                     | `Profile not found`                    |
| 400    | A malformed user ID or paging values                                                       | `Validation failed (uuid is expected)` |

## Types

```ts
type ProfileSummary = {
  id: string;
  displayName: string;
  photo: Photo | null; // Photo: see photos.md
  followedByMe: boolean;
};
type FollowListItem = { followedAt: string; profile: ProfileSummary };
type FollowPage = { data: FollowListItem[]; nextCursor: string | null };
type FeedPage = RecipePage; // RecipePage: see recipes.md
```
