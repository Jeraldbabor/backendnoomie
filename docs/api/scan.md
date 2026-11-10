# Food scan

The user takes a photo of food, and the scan returns **recipes with similar photos**, closest
first, for the user to choose from. It works by comparing photos, so it knows every dish
someone has posted a photo of. **A brand-new dish a user invents can be found as soon as
its recipe has a photo**, with no retraining.

Users can also **teach the scan**: after a scan, saying which recipe it was makes that dish
easier to find next time.

To show **what's in** the dish the user picks (ingredients, calories, nutrients and
highlights such as "High in protein"), get its [recipe nutrition](nutrition.md). The scan
itself only compares photos; it doesn't look for ingredients in the photo.

Signed-in users only. The scanned photo isn't stored. Its fingerprint (a list of 512 numbers,
not the photo) is kept for an hour, so the user can confirm which recipe it was.

How to call it from the Noomie app: [app integration](../app-integration/noomie-app.md#food-scan-in-the-app).

## Endpoints

| Method | Path                           | Who       | Success |
| ------ | ------------------------------ | --------- | ------- |
| POST   | `/api/v1/scan`                 | Signed in | 200     |
| POST   | `/api/v1/scan/:scanId/confirm` | Signed in | 204     |

## Scan a photo: `POST /api/v1/scan` (signed in)

Send **`multipart/form-data`** with one file in the field **`photo`**, exactly like a
[photo upload](photos.md#upload-a-photo). The same rules apply: JPEG, PNG or WebP, up to 10 MB
and 40 megapixels, 20 uploads per minute. **HEIC isn't accepted**: convert it to JPEG first.

Returns **200**, usually in under a second:

```json
{
  "scanId": "01a1c302-4403-7c1c-baf8-98a7d4ad9427",
  "matches": [
    {
      "recipe": {
        "id": "01a1c302-3f85-764b-860c-74c7aa1af3bf",
        "title": "Beignets",
        "description": null,
        "cuisine": "French",
        "minutes": 40,
        "servings": 6,
        "ingredients": [
          { "name": "flour", "quantity": 500, "unit": "g", "note": null }
        ],
        "createdAt": "2026-11-10T01:11:06.885Z",
        "updatedAt": "2026-11-10T01:11:06.963Z",
        "photo": {
          "small": "/api/v1/images/01a1c302-3fc2-7331-8601-58ca7e1ed8f6/small",
          "large": "/api/v1/images/01a1c302-3fc2-7331-8601-58ca7e1ed8f6/large",
          "width": 512,
          "height": 512
        },
        "author": {
          "id": "01a1c302-3e9b-76cd-84b0-cb227dd24762",
          "displayName": "Ada",
          "photo": null
        },
        "savedByMe": false
      },
      "similarity": 0.86,
      "confidence": "strong"
    }
  ]
}
```

- **`scanId`** identifies this scan for [teaching](#teach-the-scan-post-apiv1scanscanidconfirm-signed-in).
  It works for an hour, and only for the user who scanned.
- **`matches`** has up to 3 recipes, closest first. `[]` means nothing looks similar enough;
  that's a normal result with **200**, not an error.
- **`recipe`** is a recipe as in other lists: the [recipe object](recipes.md#the-recipe-object)
  [without `steps`](recipes.md#in-lists-recipes-have-no-steps).
- **`similarity`** is how alike the two photos look, from 0 to 1. It isn't a percentage of
  certainty, so don't show it as "94% sure".
- **`confidence`** is `strong` (0.85 or more) or `possible` (0.75 to 0.84). Use it to word the
  result: "Looks like" for `strong`, "Could be" for `possible`.

## How it finds new dishes

A dish is found by its examples: its recipe photo, plus any photos users taught it (see
below), plus, for the [starter dishes](scan-starter-dishes.md), example photos loaded with
`npm run db:seed:dishes`. Every recipe photo gets a fingerprint when it's uploaded with
[`PUT /api/v1/recipes/:id/photo`](photos.md#upload-a-photo). A scan compares the photo's
fingerprint with all of them.

- **Only recipes with examples can be found.** A recipe without a photo, a taught example,
  or starter example photos is invisible to the scan; that includes the three sample recipes.
- **Starter dishes come with the backend.** 42 common Filipino dishes are Noomie editorial
  recipes (`author: null`) with about 5 example photos each, so the scan knows them from the
  start. Their recipes have no photo of their own (`photo: null`). See
  [starter dishes](scan-starter-dishes.md) for the list and how well it works.
- Replacing a photo replaces its fingerprint. Removing the photo or deleting the recipe
  removes the dish from the scan.
- If a photo couldn't be fingerprinted, the upload still succeeds; the recipe just can't be
  found by the scan.

## Teach the scan: `POST /api/v1/scan/:scanId/confirm` (signed in)

Tells the scan which recipe a recent scan showed. The scan's fingerprint is saved as one more
example of that recipe, so similar photos find it more easily, for everyone. There's no
retraining: it works on the next scan.

```json
{ "recipeId": "01a1c302-3f85-764b-860c-74c7aa1af3bf" }
```

Returns **204** with no body. Sending the same confirmation again also returns **204** and
changes nothing, so a retry is safe.

**Which recipes can be confirmed:**

- **One of this scan's `matches`**, by anyone. This is the "Which one is it?" step.
- **Any recipe of your own**, even one the scan didn't offer. This is how authors teach their
  own dish more photos, which matters most when the scan doesn't find it at all yet.
- Nothing else. Users can't attach their photos to someone else's recipe that the scan didn't
  suggest. That keeps people from pushing unrelated photos onto other people's dishes.

**Limits:** a scan can be confirmed only by the user who scanned, within an hour, and as one
recipe. Each user keeps their newest 3 examples per recipe, and each recipe keeps its newest
20 taught examples. Older ones are replaced. Recipe photos don't count toward either limit.

**What it does, measured on 8 real photos of beignets.** The recipe had 1 photo, then its
author taught it 3 more. Another user scanned the same 4 new photos before and after:

| Photo | Before   | After    |
| ----- | -------- | -------- |
| 1     | 0.79     | **0.86** |
| 2     | 0.75     | 0.76     |
| 3     | no match | **0.86** |
| 4     | no match | **0.85** |

**Privacy:** a taught example is a fingerprint, never the photo. Examples are deleted with the
recipe, and with the account of the user who taught them.

## Results are suggestions, never facts

**Show `matches` as "similar recipes" the user picks from, and always offer a way out**, such
as "None of these" leading to search or to adding their own recipe. The scan compares how
photos look. It doesn't understand food, so it can't confirm what a dish is, what's in it, or
whether it's safe to eat. Don't use it for allergy or food-safety information.

Tested on 419 real food photos: 131 of 16 Filipino dishes and 288 of 24 other foods.

| Photos posted per dish | Right recipe first | Right recipe in the top 3 |
| ---------------------- | ------------------ | ------------------------- |
| 1                      | 53–59%             | 74–81%                    |
| 3                      | 71–72%             | 88–91%                    |

Telling adobo from sinigang was right 95–97% of the time; the harder part is close variants
of one dish, such as chicken adobo in soy sauce or in patis. Treat these numbers as a guide:
the sample is small, and some of its photos are near copies of each other.

**Foods nobody has posted can still get matches.** In the same test, about 64% of never-posted
foods got at least a `possible` match, compared with about 2% at `strong`. That's the reason
for the "None of these" option.

## Errors

| Status | When                                             | Message                                                       |
| ------ | ------------------------------------------------ | ------------------------------------------------------------- |
| 400    | No file in the field `photo`                     | `Send the image as a multipart/form-data field named "photo"` |
| 400    | Not a JPEG, PNG or WebP image, or a damaged file | `Upload a JPEG, PNG or WebP image`                            |
| 400    | Over 40 megapixels                               | `The image can be at most 40 megapixels`                      |
| 413    | Over 10 MB                                       | `File too large`                                              |
| 401    | Not signed in                                    | `Sign in to continue`                                         |
| 429    | More than 20 scans in a minute                   | `ThrottlerException: Too Many Requests`                       |
| 503    | The food-scan model isn't available              | `Food scan is not available right now`                        |

Confirming a scan:

| Status | When                                                     | Message                                                               |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------------- |
| 404    | Unknown scan, someone else's scan, or older than an hour | `Scan not found or expired`                                           |
| 404    | The recipe doesn't exist                                 | `Recipe <id> not found`                                               |
| 403    | Someone else's recipe that the scan didn't offer         | `You can confirm one of this scan's matches, or a recipe of your own` |
| 409    | This scan was already confirmed as another recipe        | `This scan was already confirmed as another recipe`                   |
| 400    | `recipeId` isn't a UUID                                  | `recipeId must be a UUID` (in a list)                                 |
| 401    | Not signed in                                            | `Sign in to continue`                                                 |

The 403 and 409 messages are user-friendly. On a 404 for the scan, ask the user to scan again.

The format, size and 503 messages are user-friendly. The "field named photo" message is for
developers. On a 503, keep the photo and offer to try again.

## Types

```ts
type ScanMatch = {
  recipe: RecipeSummary; // see recipes.md
  similarity: number;
  confidence: 'strong' | 'possible';
};
type ScanResult = { scanId: string; matches: ScanMatch[] };
type ConfirmScan = { recipeId: string };
```
