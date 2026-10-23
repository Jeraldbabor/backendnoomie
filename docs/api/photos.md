# Photos

Recipes and profiles can have a photo. Authors upload their recipe's photo, and every user
can upload their own profile photo. Anyone can see photos.

How to pick, upload and show photos in the Noomie app: [app integration](../app-integration/noomie-app.md#photos-in-the-app).

## Endpoints

| Method | Path                        | Who         | Success |
| ------ | --------------------------- | ----------- | ------- |
| PUT    | `/api/v1/recipes/:id/photo` | Author only | 200     |
| DELETE | `/api/v1/recipes/:id/photo` | Author only | 204     |
| PUT    | `/api/v1/profiles/me/photo` | Signed in   | 200     |
| DELETE | `/api/v1/profiles/me/photo` | Signed in   | 204     |
| GET    | `/api/v1/images/:id/:size`  | Anyone      | 200     |

## The photo object

Recipes (`photo`), recipe authors (`author.photo`) and profiles (`photo`) have this object,
or `null` when there is no photo:

```json
{
  "small": "/api/v1/images/01a1676b-0a3c-7178-b1b8-3bba16c41efe/small",
  "large": "/api/v1/images/01a1676b-0a3c-7178-b1b8-3bba16c41efe/large",
  "width": 1600,
  "height": 1200
}
```

- **`small`** is for lists, cards and avatars; **`large`** is for a full-screen recipe or
  profile.
- **`width` and `height`** are the size of `large` in pixels; `small` has the same shape.
  Use them to reserve the right space before the image loads.
- **The URLs are paths on the API.** Turn them into full URLs against the API's address
  (`new URL(photo.large, apiUrl)`). Later they may be full URLs (for example from a CDN), and
  the same code then keeps working.

| Photo         | `large`                       | `small`                     |
| ------------- | ----------------------------- | --------------------------- |
| Recipe photo  | Up to 1600 × 1600, same shape | Up to 480 × 480, same shape |
| Profile photo | 512 × 512 square              | 128 × 128 square            |

Recipe photos keep their shape and are never enlarged. Profile photos are cropped to a
centered square.

## Upload a photo

`PUT /api/v1/recipes/:id/photo` (author only) or `PUT /api/v1/profiles/me/photo` (signed in).

Send **`multipart/form-data`** with one file in the field **`photo`**, and nothing else:

```http
PUT /api/v1/recipes/01a166a9-eb95-75bf-b0a5-eae644b98f4f/photo
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=…

--…
Content-Disposition: form-data; name="photo"; filename="photo.jpg"
Content-Type: image/jpeg

<the image bytes>
--…--
```

| Rule   | Limit                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Format | JPEG, PNG or WebP, checked from the file itself (not its name or type) |
| Size   | Up to 10 MB, and up to 40 megapixels                                   |
| Rate   | 20 uploads per minute per device                                       |

**HEIC isn't accepted** (the default format of iPhone photos). Convert it to JPEG in the
app before uploading; the app integration page shows how.

What the server does with the photo:

- turns it upright, using the orientation the camera recorded;
- resizes it to the sizes above and stores it as WebP;
- **removes all metadata, including the location** that phones record in photos.

Returns **200** with the updated recipe (the full recipe, with `steps`) or profile, including
the new `photo`. Uploading again **replaces** the photo; the old one is deleted, and its URLs
return 404 from then on.

Recipe photo response (shortened):

```json
{
  "title": "Garlic butter noodles",
  "photo": {
    "small": "/api/v1/images/01a1676b-0a3c-7178-b1b8-3bba16c41efe/small",
    "large": "/api/v1/images/01a1676b-0a3c-7178-b1b8-3bba16c41efe/large",
    "width": 1600,
    "height": 1200
  },
  "author": {
    "id": "01a1676b-07e1-7348-bb8d-0342ae9262bb",
    "displayName": "Ada",
    "photo": null
  },
  "…": "…"
}
```

Profile photo response:

```json
{
  "id": "01a1676b-07e1-7348-bb8d-0342ae9262bb",
  "displayName": "Ada",
  "bio": null,
  "createdAt": "2026-10-23T06:20:30.049Z",
  "photo": {
    "small": "/api/v1/images/01a1676b-0cc9-74bc-aafa-cda42f14c218/small",
    "large": "/api/v1/images/01a1676b-0cc9-74bc-aafa-cda42f14c218/large",
    "width": 512,
    "height": 512
  },
  "recipeCount": 1
}
```

## Remove a photo

`DELETE /api/v1/recipes/:id/photo` (author only) or `DELETE /api/v1/profiles/me/photo`
(signed in). No body. Returns **204**, also when there was no photo. The photo's URLs return
404 afterwards.

Photos are also deleted when their recipe is deleted, and when their owner
[deletes their account](authentication.md#delete-account-post-apiv1authdelete-account-signed-in).

## Image files: `GET /api/v1/images/:id/:size`

The URLs in photo objects. `size` is `small` or `large`. No token needed.

- Returns **200** with the image (`Content-Type: image/webp`).
- `Cache-Control: public, max-age=31536000, immutable`: a URL always shows the same image,
  so the app and browsers can cache it for good. A new photo gets a new URL.
- Not rate-limited, so screens with many photos are fine.
- **404** `Image not found` for a deleted or unknown image. Show a placeholder.

## Errors

| Status | When                                               | Message                                                       |
| ------ | -------------------------------------------------- | ------------------------------------------------------------- |
| 400    | No file in the field `photo`                       | `Send the image as a multipart/form-data field named "photo"` |
| 400    | Not a JPEG, PNG or WebP image, or a damaged file   | `Upload a JPEG, PNG or WebP image`                            |
| 400    | Over 40 megapixels                                 | `The image can be at most 40 megapixels`                      |
| 413    | Over 10 MB                                         | `File too large`                                              |
| 401    | Not signed in                                      | `Sign in to continue`                                         |
| 403    | Someone else's recipe, or an editorial recipe      | `Only the recipe author can change it`                        |
| 404    | The recipe doesn't exist                           | `Recipe <id> not found`                                       |
| 404    | Image file that doesn't exist                      | `Image not found`                                             |
| 400    | Image file path with a size other than small/large | `Validation failed (enum string is expected)`                 |
| 429    | More than 20 uploads in a minute                   | `ThrottlerException: Too Many Requests`                       |

The format, size and megapixel messages are user-friendly. The "field named photo" message
is for developers.

## Types

```ts
type Photo = { small: string; large: string; width: number; height: number };
// On Recipe and RecipeSummary: photo: Photo | null; author: { id; displayName; photo: Photo | null } | null
// On Profile: photo: Photo | null
```
