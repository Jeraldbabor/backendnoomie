# Authentication

Users sign up and sign in with email and password. Signing in returns a **session token**.
Send it on every request that needs a signed-in user:

```http
Authorization: Bearer <token>
```

How the Noomie app handles this today: [app integration](../app-integration/noomie-app.md#authentication-in-the-app).

## Endpoints

| Method | Path                           | Who       | Success |
| ------ | ------------------------------ | --------- | ------- |
| POST   | `/api/v1/auth/register`        | Anyone    | 201     |
| POST   | `/api/v1/auth/login`           | Anyone    | 200     |
| GET    | `/api/v1/auth/me`              | Signed in | 200     |
| POST   | `/api/v1/auth/logout`          | Signed in | 204     |
| POST   | `/api/v1/auth/logout-all`      | Signed in | 204     |
| POST   | `/api/v1/auth/change-password` | Signed in | 204     |
| POST   | `/api/v1/auth/delete-account`  | Signed in | 204     |

### Register: `POST /api/v1/auth/register`

```json
{
  "displayName": "Ada",
  "email": "ada@example.com",
  "password": "correct horse battery"
}
```

Returns **201** and signs the user in:

```json
{
  "user": {
    "id": "01a16214-16ed-71e7-8d20-534458198445",
    "email": "ada@example.com",
    "displayName": "Ada",
    "createdAt": "2026-10-22T05:27:26.189Z"
  },
  "token": "<session token: 43 random characters>",
  "expiresAt": "2026-11-21T05:27:26.170Z"
}
```

| Field         | Rule                                                      | Error message                            |
| ------------- | --------------------------------------------------------- | ---------------------------------------- |
| `displayName` | Required, 1–50 characters after trimming                  | `Enter your name`                        |
| `email`       | Valid email, up to 254 characters; trimmed and lowercased | `Enter a valid email address`            |
| `password`    | 8–128 characters; not trimmed; no other rules             | `Password must be at least 8 characters` |

- Email already registered: **409** `An account with this email already exists`.
- Invalid fields: **400** with all messages in a list. These messages are user-friendly.

### Sign in: `POST /api/v1/auth/login`

```json
{ "email": "ada@example.com", "password": "correct horse battery" }
```

Returns **200** with the same shape as register. A wrong password and an unknown email both
return the same **401** `Incorrect email or password`, so the response never reveals which
emails have accounts. Show that message as it is.

### Current user: `GET /api/v1/auth/me` (signed in)

Returns **200** with the user object (`id`, `email`, `displayName`, `createdAt`). Use it when
the app opens to check that a saved token still works, and after the user edits their
profile, to refresh the stored user. The display name and bio are edited through
[`PATCH /api/v1/profiles/me`](profiles.md#edit-your-profile-patch-apiv1profilesme-signed-in).

### Sign out: `POST /api/v1/auth/logout` (signed in)

Returns **204**. The token stops working immediately on the server. Other devices stay
signed in.

## Account settings

These three need the user to be signed in. Change password and delete account also ask for
the current password.

**A wrong password returns 400, not 401.** The session is still valid, so the app must not
sign the user out; show the message next to the password field instead.

### Sign out everywhere: `POST /api/v1/auth/logout-all` (signed in)

No body. Returns **204** and ends **every** session of the user, including the one that sent
the request. Every device gets 401 `Sign in to continue` on its next signed-in request.
Afterwards, clear the saved session on this device and go to sign-in.

### Change password: `POST /api/v1/auth/change-password` (signed in)

```json
{ "currentPassword": "correct horse battery", "newPassword": "brand new pass" }
```

Returns **204** with no body. The device that made the change **stays signed in** with the
same token (and the same `expiresAt`). Every other device is signed out, so someone who
knew the old password loses access everywhere.

| Field             | Rule                                        | Error message                            |
| ----------------- | ------------------------------------------- | ---------------------------------------- |
| `currentPassword` | Required, up to 128 characters; not trimmed | `Enter your current password`            |
| `newPassword`     | 8–128 characters; not trimmed               | `Password must be at least 8 characters` |

Errors, all **400** and user-friendly:

| When                               | `message`                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Wrong current password             | `Current password is incorrect`                                             |
| New password same as the current   | `Choose a new password that is different from the current one`              |
| Fields missing or too short (list) | `["Enter your current password", "Password must be at least 8 characters"]` |

### Delete account: `POST /api/v1/auth/delete-account` (signed in)

```json
{ "password": "correct horse battery" }
```

Returns **204** with no body. **This is permanent and can't be undone.** It deletes:

- the account: email, name, bio, and password;
- every session, so every device is signed out;
- the user's saved recipes list;
- **every recipe the user wrote**. Those recipes also disappear from other users' saved
  lists (like any [deleted recipe](saved-recipes.md#when-a-recipe-is-deleted)).

Afterwards the user's profile and recipes return **404**, and signing in returns 401
`Incorrect email or password`. The email is free again: registering with it creates a new,
empty account with a new ID. Clear the saved session on this device and go to sign-in.

It's a `POST` with a body, not a `DELETE`, because some HTTP clients and proxies drop the
body of a `DELETE` request.

| Field      | Rule                                        | Error message         |
| ---------- | ------------------------------------------- | --------------------- |
| `password` | Required, up to 128 characters; not trimmed | `Enter your password` |

- Wrong password: **400** `Password is incorrect`. Nothing is deleted.
- Empty password (`""`): **400** `["Enter your password"]`. Always send the field; leaving
  it out adds technical messages to the list.

Before calling it, tell the user exactly what will be deleted and ask them to confirm.

## Sessions and tokens

- A token lasts **30 days** (`expiresAt` says when). There is no refresh token: after it
  expires, the user signs in again.
- **Any 401 on a signed-in request means the session is over** (expired, signed out, signed
  out everywhere, password changed on another device, account deleted, or invalid):
  `Sign in to continue`. Clear the saved token and user, and go to sign-in.
- The token is returned only once, at register/login. The server keeps only a hash of it,
  so it can't be looked up again.
- Store it securely (Keychain/Keystore on phones). Never log it, put it in a URL, or send it
  anywhere except this API.

## Types

```ts
type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};
type AuthResponse = { user: User; token: string; expiresAt: string };
```

## Limits and what's missing

- Every endpoint on this page allows **10 requests per minute** per device and endpoint;
  more returns **429**. This also limits password guessing on change password and delete
  account.
- Not available yet: password reset (forgot password), email verification, changing email,
  and social sign-in.
