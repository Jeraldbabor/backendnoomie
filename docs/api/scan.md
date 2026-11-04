# Food scan

The user takes a photo of food, and the scan returns **recipes with similar photos**, closest
first, for the user to choose from. It works by comparing photos, so it knows every dish
someone has posted a photo of. **A brand-new dish a user invents can be found as soon as
its recipe has a photo**, with no retraining.

Signed-in users only. The scanned photo isn't stored.

How to call it from the Noomie app: [app integration](../app-integration/noomie-app.md#food-scan-in-the-app).

## Endpoints

| Method | Path           | Who       | Success |
| ------ | -------------- | --------- | ------- |
| POST   | `/api/v1/scan` | Signed in | 200     |

## Scan a photo: `POST /api/v1/scan` (signed in)

Send **`multipart/form-data`** with one file in the field **`photo`**, exactly like a
[photo upload](photos.md#upload-a-photo). The same rules apply: JPEG, PNG or WebP, up to 10 MB
and 40 megapixels, 20 uploads per minute. **HEIC isn't accepted**: convert it to JPEG first.

Returns **200**, usually in under a second:

```json
{
  "matches": [
    {
      "recipe": {
        "id": "01a1a40a-bb2f-769e-8249-bad8d9b9f210",
        "title": "Lola's chicken adobo",
        "description": null,
        "cuisine": "Filipino",
        "minutes": 45,
        "servings": 4,
        "ingredients": [
          { "name": "chicken", "quantity": 1, "unit": "kg", "note": null }
        ],
        "createdAt": "2026-11-04T00:52:09.135Z",
        "updatedAt": "2026-11-04T00:52:11.074Z",
        "photo": {
          "small": "/api/v1/images/01a1a40a-c15c-73c8-8378-556184f6ea88/small",
          "large": "/api/v1/images/01a1a40a-c15c-73c8-8378-556184f6ea88/large",
          "width": 1200,
          "height": 1600
        },
        "author": {
          "id": "01a1a40a-b8e7-717f-8ce4-b03904eeeecd",
          "displayName": "Ada",
          "photo": null
        },
        "savedByMe": false
      },
      "similarity": 0.94,
      "confidence": "strong"
    }
  ]
}
```

- **`matches`** has up to 3 recipes, closest first. `[]` means nothing looks similar enough;
  that's a normal result with **200**, not an error.
- **`recipe`** is a recipe as in other lists: the [recipe object](recipes.md#the-recipe-object)
  [without `steps`](recipes.md#in-lists-recipes-have-no-steps).
- **`similarity`** is how alike the two photos look, from 0 to 1. It isn't a percentage of
  certainty, so don't show it as "94% sure".
- **`confidence`** is `strong` (0.85 or more) or `possible` (0.75 to 0.84). Use it to word the
  result: "Looks like" for `strong`, "Could be" for `possible`.

## How it finds new dishes

Every recipe photo gets a fingerprint when it's uploaded with
[`PUT /api/v1/recipes/:id/photo`](photos.md#upload-a-photo). A scan compares the photo's
fingerprint with all of them.

- **Only recipes with a photo can be found.** A recipe without one is invisible to the scan,
  and that includes the three sample recipes.
- Replacing a photo replaces its fingerprint. Removing the photo or deleting the recipe
  removes the dish from the scan.
- If a photo couldn't be fingerprinted, the upload still succeeds; the recipe just can't be
  found by the scan.

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

The format, size and 503 messages are user-friendly. The "field named photo" message is for
developers. On a 503, keep the photo and offer to try again.

## Types

```ts
type ScanMatch = {
  recipe: RecipeSummary; // see recipes.md
  similarity: number;
  confidence: 'strong' | 'possible';
};
type ScanResult = { matches: ScanMatch[] };
```
