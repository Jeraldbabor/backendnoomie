# Authentication

Users sign up and sign in with email and password. Signing in returns a **session token**.
Send it on every request that needs a signed-in user:

```http
Authorization: Bearer <token>
```

How the Noomie app handles this today: [app integration](../app-integration/noomie-app.md#authentication-in-the-app).

## Endpoints

| Method | Path                    | Who       | Success |
| ------ | ----------------------- | --------- | ------- |
| POST   | `/api/v1/auth/register` | Anyone    | 201     |
| POST   | `/api/v1/auth/login`    | Anyone    | 200     |
| GET    | `/api/v1/auth/me`       | Signed in | 200     |
| POST   | `/api/v1/auth/logout`   | Signed in | 204     |

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
the app opens to check that a saved token still works.

### Sign out: `POST /api/v1/auth/logout` (signed in)

Returns **204**. The token stops working immediately on the server. Other devices stay
signed in.

## Sessions and tokens

- A token lasts **30 days** (`expiresAt` says when). There is no refresh token: after it
  expires, the user signs in again.
- **Any 401 on a signed-in request means the session is over** (expired, signed out, or
  invalid): `Sign in to continue`. Clear the saved token and user, and go to sign-in.
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

- Sign-in and registration allow **10 requests per minute** per device and endpoint; more
  returns **429**.
- Not available yet: password reset, email verification, changing email or password, account
  deletion, social sign-in, and "sign out on all devices".
