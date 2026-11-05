# Profiles

A profile is the public side of a user: name, bio, when they joined, and how many recipes
they've written. Anyone can view a profile. Users can only edit their own, through
`/profiles/me`.

Private account data (email) is never part of a profile, not even your own; use
[`GET /api/v1/auth/me`](authentication.md#current-user-get-apiv1authme-signed-in) for that.
How to call these from the Noomie app: [app integration](../app-integration/noomie-app.md#profiles-in-the-app).

## Endpoints

| Method | Path                       | Who       | Success |
| ------ | -------------------------- | --------- | ------- |
| GET    | `/api/v1/profiles/:userId` | Anyone    | 200     |
| GET    | `/api/v1/profiles/me`      | Signed in | 200     |
| PATCH  | `/api/v1/profiles/me`      | Signed in | 200     |

The photo has its own endpoints, `PUT` and `DELETE /api/v1/profiles/me/photo`; see
[photos](photos.md#upload-a-photo).

A user's recipes come from the recipe list: `GET /api/v1/recipes?authorId=<userId>`
(see [recipes](recipes.md#list-recipes-get-apiv1recipes)). Following, followers and the
feed are in [follows and feed](follows.md).

## The profile object

```json
{
  "id": "01a167aa-191e-73df-8561-6cc34e5ff6fc",
  "displayName": "Ben",
  "bio": null,
  "createdAt": "2026-10-23T07:29:23.230Z",
  "photo": null,
  "recipeCount": 1,
  "followerCount": 1,
  "followingCount": 0,
  "followedByMe": true
}
```

- `id` is the user's ID, the same as `author.id` on recipes and `user.id` from sign-in.
- `bio` is `null` when the user hasn't written one.
- `createdAt` is when the account was created ("member since").
- `recipeCount` counts the recipes this user authored.
- `followerCount` and `followingCount` count who follows them and who they
  [follow](follows.md).
- `followedByMe` is `true` when the signed-in viewer follows this user. It's `false`
  without a token, and on your own profile (you can't follow yourself).
- `photo` is the user's [photo](photos.md#the-photo-object), or `null` when they haven't
  added one. Users upload and remove their own with `PUT` and `DELETE /api/v1/profiles/me/photo`.

## View a profile: `GET /api/v1/profiles/:userId`

No sign-in needed. Use it for the author link on a recipe: `recipe.author.id` is the `userId`.
**Send the token when the user is signed in** to get `followedByMe`. A token that is sent
but invalid or expired gets **401** `Sign in to continue`, like on recipe reads.

- **404** `Profile not found` if there is no such user.
- **400** `Validation failed (uuid is expected)` if the ID isn't a valid UUID.

## Your own profile: `GET /api/v1/profiles/me` (signed in)

Returns **200** with your profile, in the same shape as above. **401** `Sign in to continue`
without a valid session.

## Edit your profile: `PATCH /api/v1/profiles/me` (signed in)

Send only the fields you change:

```json
{ "displayName": "Ada L.", "bio": "Home cook. Mostly noodles." }
```

| Field         | Rule                                                     | Error message                        |
| ------------- | -------------------------------------------------------- | ------------------------------------ |
| `displayName` | If sent: 1–50 characters after trimming; can't be null   | `Enter your name`                    |
| `bio`         | Up to 160 characters, trimmed; `""` or `null` removes it | `Bio must be at most 160 characters` |

Returns **200** with the updated profile. The new name shows everywhere: on the profile, on
the user's recipes (`author.displayName`), and in `GET /api/v1/auth/me`.

You can't change your email, ID, or anything else here: other fields are rejected with
**400** (`property email should not exist`). There is no way to edit another user's profile.

## Errors

| Status | When                                      | Message                                                           |
| ------ | ----------------------------------------- | ----------------------------------------------------------------- |
| 401    | `/me` routes without a valid session      | `Sign in to continue`                                             |
| 404    | Unknown user ID                           | `Profile not found`                                               |
| 400    | Invalid fields, extra fields, or a bad ID | List of field messages, or `Validation failed (uuid is expected)` |

## Types

```ts
type Profile = {
  id: string;
  displayName: string;
  bio: string | null;
  photo: Photo | null; // Photo: see photos.md
  createdAt: string;
  recipeCount: number;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
};
type ProfileUpdate = { displayName?: string; bio?: string | null };
```
