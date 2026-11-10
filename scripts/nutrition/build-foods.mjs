// Builds src/features/nutrition/usda-foods.ts, the food table recipe nutrition uses, from the
// reviewed list in scripts/nutrition/foods.mjs and USDA FoodData Central data.
//
//   npm run nutrition:build -- <folder>
//
// <folder> is the unzipped "SR Legacy" CSV download (April 2018) from
// https://fdc.nal.usda.gov/download-datasets, the folder with food.csv, food_nutrient.csv
// and food_portion.csv. The data is public domain (CC0 1.0). The script fails, and writes
// nothing, when the list names a food or portion that isn't in the data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESCRIBING_PHRASES, FOODS } from './foods.mjs';

const OUT = fileURLToPath(
  new URL('../../src/features/nutrition/usda-foods.ts', import.meta.url),
);

/** USDA nutrient ids of the values the API reports, per 100 g of food. */
const NUTRIENTS = {
  energyKcal: '1008',
  proteinG: '1003',
  fatG: '1004',
  saturatedFatG: '1258',
  carbsG: '1005',
  fiberG: '1079',
  sugarsG: '2000',
  sodiumMg: '1093',
};

/** Millilitres in one of each US volume measure USDA portions use. */
const PORTION_ML = {
  cup: 236.5882365,
  tbsp: 14.78676478125,
  tablespoon: 14.78676478125,
  tsp: 4.92892159375,
  teaspoon: 4.92892159375,
  'fl oz': 29.5735295625,
  liter: 1000,
};

const UNIT_FIELDS = ['each', 'clove', 'slice', 'can', 'bunch'];

const folder = process.argv[2];
if (!folder || !fs.existsSync(path.join(folder, 'food.csv'))) {
  console.error(
    'Usage: npm run nutrition:build -- <folder with the SR Legacy CSV files>',
  );
  process.exit(1);
}

/** Parses one CSV line (USDA quotes every field and doubles quotes inside them). */
function parseLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      fields.push(field);
      field = '';
    } else field += c;
  }
  fields.push(field);
  return fields;
}

/** The rows of a USDA CSV file as objects keyed by its header, for the wanted foods only. */
function readRows(file, wanted) {
  const [header, ...lines] = fs
    .readFileSync(path.join(folder, file), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const columns = parseLine(header);
  const fdcColumn = columns.indexOf('fdc_id');
  return lines
    .map(parseLine)
    .filter((fields) => wanted.has(fields[fdcColumn]))
    .map((fields) =>
      Object.fromEntries(columns.map((name, i) => [name, fields[i]])),
    );
}

const round = (value, places) => Number(value.toFixed(places));
const errors = [];
const wanted = new Set(FOODS.map((food) => String(food.fdc)));

const descriptions = new Map(
  readRows('food.csv', wanted)
    .filter((row) => row.data_type === 'sr_legacy_food')
    .map((row) => [row.fdc_id, row.description]),
);
const amounts = new Map();
for (const row of readRows('food_nutrient.csv', wanted)) {
  amounts.set(`${row.fdc_id}:${row.nutrient_id}`, Number(row.amount));
}
const portions = new Map();
for (const row of readRows('food_portion.csv', wanted)) {
  const list = portions.get(row.fdc_id) ?? [];
  list.push({
    label: `${row.amount} ${row.modifier}`.trim(),
    amount: Number(row.amount),
    modifier: row.modifier,
    grams: Number(row.gram_weight),
  });
  portions.set(row.fdc_id, list);
}

function portion(food, label) {
  const found = portions
    .get(String(food.fdc))
    ?.find((candidate) => candidate.label === label);
  if (!found) {
    const known = (portions.get(String(food.fdc)) ?? []).map((p) => p.label);
    errors.push(
      `${food.fdc}: no portion "${label}". USDA has: ${known.join(' | ') || 'none'}`,
    );
  }
  return found;
}

function gramsPerMl(food) {
  if (!food.volume) return null;
  const found = portion(food, food.volume);
  if (!found) return null;
  const measure = Object.keys(PORTION_ML).find((unit) =>
    new RegExp(`^${unit}\\b`, 'i').test(found.modifier),
  );
  if (!measure) {
    errors.push(
      `${food.fdc}: "${food.volume}" is not a volume of cups, tbsp, tsp or fl oz`,
    );
    return null;
  }
  return found.grams / (found.amount * PORTION_ML[measure]);
}

const seenNames = new Map();
const built = FOODS.map((food) => {
  const id = String(food.fdc);
  const description = descriptions.get(id);
  if (!description) errors.push(`${id}: not an SR Legacy food`);

  for (const name of food.names) {
    if (name !== name.trim().toLowerCase() || !name) {
      errors.push(`${id}: name "${name}" must be lowercase and trimmed`);
    }
    if (seenNames.has(name)) {
      errors.push(
        `"${name}" is a name of both ${seenNames.get(name)} and ${id}`,
      );
    }
    seenNames.set(name, id);
  }

  const zero = new Set(food.zero ?? []);
  const per100g = {};
  for (const [key, nutrientId] of Object.entries(NUTRIENTS)) {
    const amount = amounts.get(`${id}:${nutrientId}`);
    if (zero.has(key) && amount !== undefined) {
      errors.push(`${id}: USDA has ${key}, so it can't be in zero`);
    }
    per100g[key] = amount ?? (zero.has(key) ? 0 : null);
  }
  for (const key of zero) {
    if (!(key in NUTRIENTS))
      errors.push(`${id}: unknown nutrient "${key}" in zero`);
  }

  const density = gramsPerMl(food);
  const gramsPer = {};
  for (const unit of UNIT_FIELDS) {
    const spec = food[unit];
    if (spec === undefined) continue;
    if (typeof spec === 'string') {
      const found = portion(food, spec);
      if (found) gramsPer[unit] = found.grams / found.amount;
    } else if (unit === 'can' && spec.ml && spec.why) {
      if (density === null) errors.push(`${id}: can in ml needs volume`);
      else gramsPer[unit] = spec.ml * density;
    } else {
      errors.push(
        `${id}: ${unit} must be a USDA portion, or for can { ml, why }`,
      );
    }
  }
  for (const key of Object.keys(food)) {
    if (!['fdc', 'names', 'volume', 'zero', ...UNIT_FIELDS].includes(key)) {
      errors.push(`${id}: unknown field "${key}"`);
    }
  }

  return {
    fdcId: food.fdc,
    description,
    names: food.names,
    per100g,
    gramsPerMl: density === null ? null : round(density, 4),
    gramsPer: Object.fromEntries(
      Object.entries(gramsPer).map(([unit, grams]) => [unit, round(grams, 2)]),
    ),
  };
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// One food per line, so a change to the list shows as a one-line diff per food.
const source = `// Generated by \`npm run nutrition:build\` from scripts/nutrition/foods.mjs and USDA
// FoodData Central SR Legacy (April 2018, public domain). Don't edit it by hand: change
// foods.mjs and rebuild. Values are per 100 g of the food as bought; null means USDA has no
// value. gramsPerMl converts volumes; gramsPer converts counts and the other units.
import type { UsdaFood } from './nutrition.types.js';

// prettier-ignore
export const USDA_FOODS: readonly UsdaFood[] = [
${built.map((food) => `  ${JSON.stringify(food)},`).join('\n')}
];

/** Words around a food's name that don't change what the food is (see foods.mjs). */
// prettier-ignore
export const DESCRIBING_PHRASES: readonly string[] = ${JSON.stringify(DESCRIBING_PHRASES)};
`;
fs.writeFileSync(OUT, source);
console.log(
  `Wrote ${built.length} foods to ${path.relative(process.cwd(), OUT)}`,
);
