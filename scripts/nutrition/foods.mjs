// The reviewed list of foods that recipe nutrition knows, and the names recipes use for them.
// `npm run nutrition:build -- <folder>` turns it into src/features/nutrition/usda-foods.ts
// using the USDA FoodData Central SR Legacy CSV files (public domain, CC0). Edit this file,
// not the generated one, then rebuild and commit both.
//
// Each food:
//   fdc     USDA FoodData Central id of the food, as bought and uncooked (raw rice, raw meat,
//           dry pasta, canned beans drained). Check the id at fdc.nal.usda.gov.
//   names   What recipes call it, in English and Filipino. Matching ignores case, accents,
//           punctuation and plural endings, and allows extra describing words around a name
//           ("2 red onions, sliced" matches "onion"), so list base names only.
//   volume  The USDA portion ("1 cup, chopped") that gives the food's weight per ml, for ml,
//           l, tsp, tbsp, cup and pinch. Leave it out when a volume of the food isn't usual.
//   each    The USDA portion that one counted item weighs ("2 eggs"). Leave it out when the
//           USDA size isn't what a recipe here would mean (a US eggplant is 3 times a Filipino
//           talong), so the ingredient shows as not counted instead of counted wrong.
//   clove, slice, can, bunch
//           The USDA portion for that unit. `can` may instead be { grams, why } for a standard
//           can size that USDA doesn't list.
//   zero    Nutrients USDA has no value for that are safe to count as 0: none in this kind
//           of food (sugars in meat), or too little in the amounts recipes use (sugars in a
//           bay leaf). Any other missing value is left unknown, and the API says so.
//
// The same fdc can appear twice when different names mean different sizes ("tomato" and
// "cherry tomato"). A name must belong to one food only, even after matching drops plural
// endings: "gatas" (milk) matches as "gata" (coconut milk), so only "gata" is listed. The
// unit tests fail when two foods' names match the same.

export const FOODS = [
  // --- Chicken -------------------------------------------------------------------------
  {
    fdc: 171447,
    names: ['chicken', 'whole chicken', 'dressed chicken', 'manok'],
  },
  {
    fdc: 171077,
    names: ['chicken breast', 'chicken breast fillet', 'pechuga'],
    each: '1 piece',
  },
  {
    fdc: 172385,
    names: ['chicken thigh', 'chicken leg', 'chicken leg quarter'],
    each: '1 thigh with skin',
  },
  {
    fdc: 173627,
    names: ['skinless chicken thigh', 'chicken thigh fillet'],
    each: '1 thigh without skin',
  },
  { fdc: 172390, names: ['chicken wing', 'chicken wingette'], each: '1 piece' },
  {
    fdc: 172373,
    names: ['chicken drumstick'],
    each: '1 drumstick with skin',
  },
  {
    fdc: 171060,
    names: ['chicken liver', 'atay ng manok'],
    each: '1 liver',
  },

  // --- Pork ----------------------------------------------------------------------------
  {
    fdc: 167843,
    names: [
      'pork',
      'pork shoulder',
      'pork butt',
      'pork cubes',
      'kasim',
      'baboy',
    ],
  },
  { fdc: 167812, names: ['pork belly', 'liempo', 'pork liempo'] },
  {
    fdc: 167902,
    names: [
      'ground pork',
      'minced pork',
      'pork mince',
      'giniling',
      'giniling na baboy',
    ],
    zero: ['sugarsG'],
  },
  {
    fdc: 167818,
    names: ['pork loin', 'pork chop', 'pork tenderloin'],
    each: '1 chop, excluding refuse (yield from 1 raw chop, with refuse, weighing 151 g)',
  },
  {
    fdc: 167853,
    names: ['pork ribs', 'pork spareribs', 'spareribs', 'baby back ribs'],
  },
  { fdc: 168277, names: ['bacon'], each: '1 slice raw', slice: '1 slice raw' },
  { fdc: 173864, names: ['ham'], each: '1 slice', slice: '1 slice' },
  { fdc: 172964, names: ['hotdog', 'hot dog', 'frankfurter'], each: '1 link' },
  {
    fdc: 174571,
    names: ['luncheon meat', 'spam'],
    slice: '1 slice (4-1/4" x 4-1/4" x 1/16")',
  },

  // --- Beef ----------------------------------------------------------------------------
  {
    fdc: 169485,
    names: [
      'beef',
      'baka',
      'beef cubes',
      'stewing beef',
      'beef chuck',
      'beef brisket',
      'beef sirloin',
      'beef steak',
      'steak',
    ],
  },
  {
    fdc: 174036,
    names: ['ground beef', 'minced beef', 'beef mince', 'giniling na baka'],
  },
  { fdc: 170827, names: ['beef short ribs', 'short ribs', 'beef ribs'] },
  { fdc: 169441, names: ['beef shank'], zero: ['sugarsG'] },
  { fdc: 170602, names: ['corned beef'], slice: '1 slice (3/4 oz)' },

  // --- Fish and seafood ----------------------------------------------------------------
  { fdc: 173675, names: ['milkfish', 'bangus'], zero: ['sugarsG'] },
  { fdc: 175176, names: ['tilapia', 'tilapia fillet'], each: '1 fillet' },
  { fdc: 175167, names: ['salmon', 'salmon fillet'] },
  { fdc: 175159, names: ['fresh tuna', 'tuna steak', 'yellowfin tuna'] },
  {
    fdc: 173709,
    names: ['tuna', 'canned tuna', 'tuna in water'],
    volume: '1 cup, solid or chunks',
    can: '1 can',
  },
  {
    fdc: 175140,
    names: ['sardines', 'sardinas', 'sardines in tomato sauce'],
    each: '1 sardine',
  },
  {
    fdc: 175179,
    names: ['shrimp', 'prawn', 'hipon'],
    zero: ['fiberG', 'sugarsG'],
  },
  { fdc: 174223, names: ['squid', 'pusit', 'calamari'] },
  { fdc: 174216, names: ['mussel', 'tahong'], each: '1 medium' },
  {
    fdc: 174204,
    names: ['crab', 'crab meat', 'alimango', 'alimasag'],
    zero: ['sugarsG'],
  },

  // --- Eggs and tofu -------------------------------------------------------------------
  {
    fdc: 171287,
    names: ['egg', 'itlog', 'whole egg'],
    volume: '1 cup (4.86 large eggs)',
    each: '1 large',
  },
  {
    fdc: 172184,
    names: ['egg yolk', 'yolk', 'pula ng itlog'],
    volume: '1 cup',
    each: '1 large',
  },
  {
    fdc: 172183,
    names: ['egg white', 'puti ng itlog'],
    volume: '1 cup',
    each: '1 large',
  },
  {
    fdc: 172475,
    names: ['tofu', 'firm tofu', 'tokwa'],
    volume: '0.5 cup',
    zero: ['sugarsG'],
  },

  // --- Rice, grains, noodles, bread ----------------------------------------------------
  {
    fdc: 168877,
    names: [
      'rice',
      'white rice',
      'jasmine rice',
      'long grain rice',
      'uncooked rice',
      'bigas',
    ],
    volume: '1 cup',
  },
  {
    fdc: 168878,
    names: [
      'cooked rice',
      'steamed rice',
      'leftover rice',
      'day old rice',
      'kanin',
    ],
    volume: '1 cup',
  },
  { fdc: 169703, names: ['brown rice'], volume: '1 cup' },
  {
    fdc: 168883,
    names: ['glutinous rice', 'sticky rice', 'sweet rice', 'malagkit'],
    volume: '1 cup',
    zero: ['sugarsG'],
  },
  {
    fdc: 169714,
    names: ['rice flour', 'glutinous rice flour', 'galapong'],
    volume: '1 cup',
  },
  {
    fdc: 168894,
    names: [
      'flour',
      'all purpose flour',
      'plain flour',
      'wheat flour',
      'harina',
    ],
    volume: '1 cup',
  },
  {
    fdc: 169698,
    names: ['cornstarch', 'corn starch', 'cornflour'],
    volume: '1 cup',
  },
  {
    fdc: 169736,
    names: [
      'pasta',
      'spaghetti',
      'macaroni',
      'elbow macaroni',
      'penne',
      'fettuccine',
      'linguine',
      'fusilli',
      'rotini',
      'lasagna',
      'lasagne',
      'dry pasta',
      'dried pasta',
    ],
    volume: '1 cup elbows',
  },
  {
    fdc: 169742,
    names: [
      'rice noodles',
      'rice vermicelli',
      'rice sticks',
      'bihon',
      'bihon noodles',
    ],
  },
  {
    fdc: 174258,
    names: [
      'sotanghon',
      'glass noodles',
      'cellophane noodles',
      'mung bean noodles',
    ],
    volume: '1 cup',
  },
  {
    fdc: 169731,
    names: [
      'egg noodles',
      'pancit canton',
      'pancit canton noodles',
      'canton noodles',
    ],
    volume: '1 cup',
  },
  { fdc: 168874, names: ['quinoa'], volume: '1 cup' },
  {
    fdc: 174924,
    names: ['bread', 'sliced bread', 'loaf bread', 'tasty bread'],
    volume: '1 cup, cubes',
    each: '1 slice',
    slice: '1 slice',
  },
  {
    fdc: 174928,
    names: ['breadcrumbs', 'bread crumbs', 'panko'],
    volume: '1 cup',
  },
  {
    fdc: 173904,
    names: ['oats', 'rolled oats', 'quick oats', 'oatmeal'],
    volume: '1 cup',
  },
  {
    fdc: 172802,
    names: [
      'lumpia wrapper',
      'spring roll wrapper',
      'egg roll wrapper',
      'wonton wrapper',
    ],
    zero: ['sugarsG'],
  },
  {
    fdc: 169717,
    names: ['tapioca pearls', 'tapioca', 'sago'],
    volume: '1 cup',
  },

  // --- Vegetables ----------------------------------------------------------------------
  {
    fdc: 169230,
    names: ['garlic', 'bawang', 'bawang puti'],
    volume: '1 tsp',
    each: '1 clove',
    clove: '1 clove',
  },
  {
    fdc: 170000,
    names: ['onion', 'sibuyas', 'shallot', 'sibuyas tagalog'],
    volume: '1 cup, chopped',
    each: '1 medium (2-1/2" dia)',
    slice: '1 slice, medium (1/8" thick)',
  },
  {
    fdc: 170005,
    names: ['spring onion', 'green onion', 'scallion', 'dahon ng sibuyas'],
    volume: '1 cup, chopped',
    each: '1 medium (4-1/8" long)',
  },
  {
    fdc: 170457,
    names: ['tomato', 'kamatis', 'roma tomato', 'plum tomato'],
    volume: '1 cup, chopped or sliced',
    each: '1 medium whole (2-3/5" dia)',
    slice: '1 slice, medium (1/4" thick)',
  },
  {
    fdc: 170457,
    names: ['cherry tomato', 'grape tomato'],
    volume: '1 cup cherry tomatoes',
    each: '1 cherry',
  },
  {
    fdc: 170026,
    names: ['potato', 'patatas'],
    volume: '0.5 cup, diced',
    each: '1 Potato medium (2-1/4" to 3-1/4" dia)',
  },
  {
    fdc: 170393,
    names: ['carrot', 'karot'],
    volume: '1 cup chopped',
    each: '1 medium',
  },
  {
    fdc: 169975,
    names: ['cabbage', 'repolyo'],
    volume: '1 cup, chopped',
    each: '1 head, medium (about 5-3/4" dia)',
  },
  {
    fdc: 170390,
    names: [
      'pechay',
      'pechay leaves',
      'petsay',
      'bok choy',
      'bok choi',
      'pak choi',
      'pak choy',
    ],
    volume: '1 cup, shredded',
  },
  {
    fdc: 169228,
    names: ['eggplant', 'talong', 'aubergine'],
    volume: '1 cup, cubes',
  },
  { fdc: 169260, names: ['okra'], volume: '1 cup', each: '8 pods (3" long)' },
  {
    fdc: 169961,
    names: [
      'green beans',
      'string beans',
      'snap beans',
      'baguio beans',
      'french beans',
    ],
    volume: '1 cup 1/2" pieces',
    each: '10 beans (4" long)',
  },
  {
    fdc: 169222,
    names: ['sitaw', 'yardlong beans', 'long beans', 'snake beans'],
    volume: '1 cup slices',
    each: '1 pod',
  },
  {
    fdc: 168451,
    names: ['radish', 'daikon', 'labanos'],
    volume: '1 cup slices',
    each: '1 radish (7" long)',
  },
  { fdc: 169308, names: ['taro', 'gabi'], volume: '1 cup, sliced' },
  {
    fdc: 168393,
    names: ['ampalaya', 'bitter gourd', 'bitter melon'],
    volume: '1 cup (1/2" pieces)',
    each: '1 balsam-pear',
    zero: ['saturatedFatG'],
  },
  {
    fdc: 170106,
    names: [
      'chili',
      'chilli',
      'chili pepper',
      'red chili',
      'hot chili',
      'hot pepper',
      'sili',
    ],
    volume: '0.5 cup, chopped or diced',
    each: '1 pepper',
  },
  {
    fdc: 170106,
    names: [
      'siling labuyo',
      'labuyo',
      "bird's eye chili",
      'thai chili',
      'siling haba',
      'finger chili',
    ],
    volume: '0.5 cup, chopped or diced',
  },
  {
    fdc: 170108,
    names: [
      'bell pepper',
      'red bell pepper',
      'red pepper',
      'yellow pepper',
      'capsicum',
      'sweet pepper',
    ],
    volume: '1 cup, chopped',
    each: '1 medium (approx 2-3/4" long, 2-1/2 dia.)',
  },
  {
    fdc: 170427,
    names: ['green bell pepper', 'green pepper', 'green capsicum'],
    volume: '1 cup, chopped',
    each: '1 medium (approx 2-3/4" long, 2-1/2" dia)',
  },
  { fdc: 169231, names: ['ginger', 'luya'], volume: '1 tsp' },
  {
    fdc: 168409,
    names: ['cucumber', 'pipino'],
    volume: '0.5 cup slices',
    each: '1 cucumber (8-1/4")',
  },
  {
    fdc: 169251,
    names: ['mushroom', 'button mushroom', 'kabute'],
    volume: '1 cup, pieces or slices',
    each: '1 medium',
  },
  {
    fdc: 168462,
    names: ['spinach', 'spinach leaves', 'baby spinach'],
    volume: '1 cup',
    bunch: '1 bunch',
  },
  {
    fdc: 169301,
    names: ['kangkong', 'kangkong leaves', 'water spinach', 'swamp cabbage'],
    volume: '1 cup, chopped',
    zero: ['saturatedFatG'],
  },
  {
    fdc: 169248,
    names: ['lettuce', 'iceberg lettuce'],
    volume: '1 cup shredded',
    each: '1 head, medium (6" dia)',
  },
  { fdc: 169248, names: ['lettuce leaves'], each: '1 leaf, medium' },
  {
    fdc: 169998,
    names: ['corn', 'sweet corn', 'corn on the cob', 'mais'],
    volume: '1 cup',
    each: '1 ear, medium (6-3/4" to 7-1/2" long) yields',
  },
  {
    fdc: 170419,
    names: ['peas', 'green peas', 'sweet peas', 'gisantes'],
    volume: '1 cup',
  },
  {
    fdc: 170010,
    names: ['snow peas', 'snap peas', 'sugar snap peas', 'sitsaro', 'chicharo'],
    volume: '1 cup, whole',
    each: '10 pea pods',
  },
  {
    fdc: 170379,
    names: ['broccoli'],
    volume: '1 cup chopped',
    bunch: '1 bunch',
  },
  {
    fdc: 168482,
    names: ['sweet potato', 'kamote', 'camote'],
    volume: '1 cup, cubes',
    each: '1 sweetpotato, 5" long',
  },
  {
    fdc: 168448,
    names: ['squash', 'kalabasa', 'pumpkin', 'calabaza'],
    volume: '1 cup (1" cubes)',
  },
  {
    fdc: 168416,
    names: [
      'malunggay',
      'malunggay leaves',
      'dahon ng malunggay',
      'moringa',
      'moringa leaves',
      'drumstick leaves',
    ],
    volume: '1 cup, chopped',
    zero: ['saturatedFatG', 'sugarsG'],
  },
  {
    fdc: 170402,
    names: ['chayote', 'sayote'],
    volume: '1 cup (1" pieces)',
    each: '1 chayote (5-3/4")',
  },
  {
    fdc: 169957,
    names: ['bean sprouts', 'mung bean sprouts', 'togue', 'toge'],
    volume: '1 cup',
  },
  {
    fdc: 168573,
    names: ['lemongrass', 'lemon grass', 'tanglad'],
    volume: '1 tbsp',
    zero: ['fiberG', 'sugarsG'],
  },
  {
    fdc: 169291,
    names: ['zucchini', 'courgette'],
    volume: '1 cup, chopped',
    each: '1 medium',
  },
  {
    fdc: 169988,
    names: ['celery', 'kinchay'],
    volume: '1 cup chopped',
    each: '1 stalk, medium (7-1/2" - 8" long)',
  },
  { fdc: 168421, names: ['kale'], volume: '1 cup' },
  {
    fdc: 169926,
    names: ['papaya', 'green papaya'],
    volume: '1 cup 1" pieces',
    each: '1 fruit, small',
  },
  { fdc: 174687, names: ['jackfruit', 'langka'], volume: '1 cup, sliced' },
  {
    fdc: 169985,
    names: ['cassava', 'kamoteng kahoy', 'balinghoy', 'yuca'],
    volume: '1 cup',
    each: '1 root',
  },
  {
    fdc: 169130,
    names: ['plantain'],
    volume: '1 cup, sliced',
    each: '1 plantain',
  },
  {
    fdc: 169130,
    names: ['saba', 'saba banana', 'saging na saba', 'cooking banana'],
    volume: '1 cup, sliced',
  },
  { fdc: 170071, names: ['yam', 'ube', 'purple yam'], volume: '1 cup, cubes' },

  // --- Herbs and spices ----------------------------------------------------------------
  { fdc: 170416, names: ['parsley'], volume: '1 cup chopped' },
  {
    fdc: 172232,
    names: ['basil', 'basil leaves', 'sweet basil'],
    volume: '2 tbsp, chopped',
    each: '5 leaves',
  },
  {
    fdc: 169997,
    names: [
      'cilantro',
      'cilantro leaves',
      'coriander',
      'coriander leaves',
      'wansoy',
    ],
    volume: '0.25 cup',
  },
  {
    fdc: 170917,
    names: [
      'bay leaf',
      'bay leaves',
      'dried bay leaves',
      'laurel',
      'laurel leaves',
      'dahon ng laurel',
    ],
    volume: '1 tbsp, crumbled',
    zero: ['sugarsG'],
  },
  {
    fdc: 170931,
    names: ['black pepper', 'pepper', 'ground pepper', 'paminta'],
    volume: '1 tsp, ground',
  },
  {
    fdc: 170931,
    names: ['peppercorns', 'whole peppercorns', 'pamintang buo'],
    volume: '1 tsp, whole',
  },
  { fdc: 171325, names: ['garlic powder'], volume: '1 tsp' },
  { fdc: 171327, names: ['onion powder'], volume: '1 tsp' },
  { fdc: 171329, names: ['paprika', 'smoked paprika'], volume: '1 tsp' },
  { fdc: 170923, names: ['cumin', 'cumin seed'], volume: '1 tsp, whole' },
  { fdc: 171320, names: ['cinnamon'], volume: '1 tsp' },
  { fdc: 171319, names: ['chili powder', 'chilli powder'], volume: '1 tsp' },
  { fdc: 171328, names: ['oregano', 'dried oregano'], volume: '1 tsp, leaves' },
  { fdc: 170938, names: ['thyme', 'dried thyme'], volume: '1 tsp, leaves' },
  { fdc: 172231, names: ['turmeric', 'luyang dilaw'], volume: '1 tsp' },
  { fdc: 170924, names: ['curry powder'], volume: '1 tsp' },
  { fdc: 170926, names: ['ground ginger', 'ginger powder'], volume: '1 tsp' },

  // --- Fruit ---------------------------------------------------------------------------
  {
    fdc: 167746,
    names: ['lemon'],
    volume: '1 cup, sections',
    each: '1 fruit (2-1/8" dia)',
    slice: '1 wedge or slice (1/8 of one 2-1/8" dia lemon)',
  },
  { fdc: 167747, names: ['lemon juice'], volume: '1 cup' },
  { fdc: 168155, names: ['lime', 'dayap'], each: '1 fruit (2" dia)' },
  { fdc: 168156, names: ['lime juice'], volume: '1 cup' },
  {
    fdc: 169910,
    names: ['mango', 'mangga'],
    volume: '1 cup pieces',
    each: '1 fruit without refuse',
  },
  {
    fdc: 173944,
    names: ['banana', 'saging', 'lakatan', 'latundan'],
    volume: '1 cup, sliced',
    each: '1 medium (7" to 7-7/8" long)',
  },
  {
    fdc: 167763,
    names: ['tamarind', 'sampalok', 'sampaloc'],
    volume: '1 cup, pulp',
    each: '1 fruit (3" x 1")',
  },
  {
    fdc: 169124,
    names: ['pineapple', 'pinya', 'pineapple chunks', 'pineapple tidbits'],
    volume: '1 cup, chunks',
    slice: '1 slice (3-1/2" dia x 3/4" thick)',
  },
  {
    fdc: 168202,
    names: ['apple', 'mansanas'],
    volume: '1 cup, sliced',
    each: '1 medium',
    zero: ['saturatedFatG'],
  },
  {
    fdc: 171705,
    names: ['avocado', 'abukado'],
    volume: '1 cup, cubes',
    each: '1 avocado, NS as to Florida or California',
  },
  {
    fdc: 167762,
    names: ['strawberry', 'strawberries'],
    volume: '1 cup, whole',
    each: '1 medium (1-1/4" dia)',
  },
  {
    fdc: 169097,
    names: ['orange'],
    volume: '1 cup, sections',
    each: '1 fruit (2-5/8" dia)',
  },

  // --- Coconut -------------------------------------------------------------------------
  {
    fdc: 170172,
    names: ['coconut milk', 'gata', 'gata ng niyog'],
    volume: '1 cup',
    can: { ml: 400, why: 'coconut milk is sold in 400 ml cans' },
  },
  { fdc: 170580, names: ['coconut cream', 'kakang gata'], volume: '1 cup' },
  { fdc: 170170, names: ['desiccated coconut', 'dried coconut'] },
  { fdc: 171412, names: ['coconut oil'], volume: '1 tbsp' },

  // --- Dairy ---------------------------------------------------------------------------
  {
    fdc: 173410,
    names: ['butter', 'salted butter', 'mantikilya'],
    volume: '1 tbsp',
  },
  { fdc: 173430, names: ['unsalted butter'], volume: '1 tbsp' },
  { fdc: 172347, names: ['margarine'], volume: '1 tbsp' },
  {
    fdc: 171265,
    names: ['milk', 'whole milk', 'fresh milk'],
    volume: '1 cup',
  },
  { fdc: 174832, names: ['almond milk'], volume: '1 cup' },
  {
    fdc: 171276,
    names: ['evaporated milk', 'evap', 'evaporada'],
    volume: '1 cup',
    can: '1 can (13 oz)',
  },
  {
    fdc: 171275,
    names: ['condensed milk', 'sweetened condensed milk', 'condensada'],
    volume: '1 cup',
    can: { ml: 300, why: 'condensed milk is sold in 300 ml cans' },
  },
  {
    fdc: 173414,
    names: ['cheese', 'cheddar', 'cheddar cheese', 'keso'],
    volume: '1 cup, shredded',
    slice: '1 slice (1 oz)',
  },
  {
    fdc: 170853,
    names: ['processed cheese', 'quick melt cheese', 'quickmelt'],
    volume: '1 cup, shredded',
    slice: '1 slice (1 oz)',
  },
  {
    fdc: 171247,
    names: ['parmesan', 'parmesan cheese', 'parmigiano'],
    volume: '1 tbsp',
  },
  {
    fdc: 170845,
    names: ['mozzarella', 'mozzarella cheese'],
    volume: '1 cup, shredded',
  },
  { fdc: 173420, names: ['feta', 'feta cheese'], volume: '1 cup, crumbled' },
  { fdc: 173418, names: ['cream cheese'], volume: '1 tbsp' },
  {
    fdc: 170859,
    names: [
      'heavy cream',
      'whipping cream',
      'heavy whipping cream',
      'cooking cream',
    ],
    volume: '1 tbsp',
  },
  {
    fdc: 170858,
    names: ['all purpose cream', 'table cream'],
    volume: '1 tbsp',
  },
  { fdc: 171257, names: ['sour cream'], volume: '1 tbsp' },
  {
    fdc: 171284,
    names: ['yogurt', 'yoghurt', 'plain yogurt'],
    volume: '1 cup (8 fl oz)',
  },

  // --- Oils and fats -------------------------------------------------------------------
  {
    fdc: 171413,
    names: ['olive oil', 'extra virgin olive oil'],
    volume: '1 tablespoon',
  },
  {
    fdc: 171411,
    names: ['oil', 'cooking oil', 'vegetable oil', 'soybean oil', 'mantika'],
    volume: '1 tbsp',
  },
  { fdc: 172336, names: ['canola oil'], volume: '1 tbsp' },
  { fdc: 171015, names: ['palm oil'], volume: '1 tbsp' },
  {
    fdc: 171016,
    names: ['sesame oil', 'toasted sesame oil'],
    volume: '1 tablespoon',
  },
  { fdc: 171009, names: ['mayonnaise', 'mayo'], volume: '1 tbsp' },

  // --- Sauces, condiments, broth -------------------------------------------------------
  {
    fdc: 174277,
    names: ['soy sauce', 'light soy sauce', 'dark soy sauce', 'toyo', 'shoyu'],
    volume: '1 tbsp',
  },
  { fdc: 174531, names: ['fish sauce', 'patis'], volume: '1 tbsp' },
  {
    fdc: 172237,
    names: [
      'vinegar',
      'white vinegar',
      'distilled vinegar',
      'cane vinegar',
      'coconut vinegar',
      'rice vinegar',
      'suka',
      'sukang maasim',
      'sukang iloko',
    ],
    volume: '1 tbsp',
  },
  {
    fdc: 173469,
    names: ['apple cider vinegar', 'cider vinegar'],
    volume: '1 tbsp',
  },
  { fdc: 174529, names: ['oyster sauce'], volume: '1 tbsp' },
  {
    fdc: 168556,
    names: ['ketchup', 'catsup', 'tomato ketchup', 'banana ketchup'],
    volume: '1 tbsp',
  },
  { fdc: 172442, names: ['miso', 'miso paste'], volume: '1 tbsp' },
  { fdc: 174266, names: ['peanut butter'], volume: '2 tbsp' },
  { fdc: 169640, names: ['honey', 'pulot'], volume: '1 tbsp' },
  {
    fdc: 170459,
    names: ['tomato paste'],
    volume: '1 tbsp',
    can: '1 can (6 oz)',
  },
  { fdc: 170054, names: ['tomato sauce'], volume: '1 cup' },
  {
    fdc: 171610,
    names: ['worcestershire sauce', 'worcestershire'],
    volume: '1 tbsp',
  },
  { fdc: 172886, names: ['hoisin sauce', 'hoisin'], volume: '1 tbsp' },
  {
    fdc: 171186,
    names: ['sriracha', 'sriracha sauce'],
    volume: '1 tsp',
    zero: ['saturatedFatG'],
  },
  {
    fdc: 172234,
    names: ['mustard', 'yellow mustard', 'prepared mustard'],
    volume: '1 cup',
  },
  { fdc: 171167, names: ['teriyaki sauce'], volume: '1 tbsp' },
  { fdc: 174066, names: ['sweet and sour sauce'], volume: '2 Tbsp' },
  {
    fdc: 174536,
    names: ['chicken broth', 'chicken stock', 'broth', 'stock', 'sabaw'],
    volume: '1 cup',
  },
  {
    fdc: 171538,
    names: ['beef broth', 'beef stock'],
    volume: '1 cup',
    can: '1 can 14.5 oz',
  },
  {
    fdc: 173647,
    names: [
      'water',
      'tubig',
      'hot water',
      'cold water',
      'warm water',
      'lukewarm water',
      'boiling water',
      'ice water',
    ],
    volume: '1 fl oz',
  },
  { fdc: 173190, names: ['red wine', 'dry red wine'], volume: '1 fl oz' },
  { fdc: 174837, names: ['white wine', 'dry white wine'], volume: '1 fl oz' },

  // --- Sugar, salt, baking -------------------------------------------------------------
  {
    fdc: 169655,
    names: [
      'sugar',
      'white sugar',
      'granulated sugar',
      'refined sugar',
      'caster sugar',
      'asukal',
    ],
    volume: '1 cup',
  },
  {
    fdc: 168833,
    names: ['brown sugar', 'muscovado', 'muscovado sugar', 'asukal na pula'],
    volume: '1 cup packed',
  },
  {
    fdc: 173468,
    names: [
      'salt',
      'table salt',
      'sea salt',
      'iodized salt',
      'rock salt',
      'asin',
    ],
    volume: '1 tsp',
  },
  { fdc: 172804, names: ['baking powder'], volume: '1 tsp' },
  {
    fdc: 175040,
    names: ['baking soda', 'bicarbonate of soda'],
    volume: '1 tsp',
  },
  {
    fdc: 175043,
    names: ['yeast', 'instant yeast', 'active dry yeast', 'dry yeast'],
    volume: '1 tsp',
  },
  {
    fdc: 173471,
    names: ['vanilla', 'vanilla extract', 'vanilla essence'],
    volume: '1 tsp',
  },
  { fdc: 169593, names: ['cocoa', 'cocoa powder'], volume: '1 tbsp' },
  { fdc: 170273, names: ['dark chocolate', 'bittersweet chocolate'] },
  { fdc: 169599, names: ['gelatin', 'gelatine', 'unflavored gelatin'] },
  { fdc: 170090, names: ['agar', 'agar agar', 'gulaman'] },

  // --- Beans, nuts, seeds --------------------------------------------------------------
  {
    fdc: 173800,
    names: ['chickpeas', 'garbanzo', 'garbanzo beans'],
    can: '1 can drained',
  },
  {
    fdc: 174285,
    names: ['kidney beans', 'red kidney beans', 'red beans'],
    can: '1 can drained solids',
  },
  { fdc: 173734, names: ['black beans'], volume: '1 cup' },
  { fdc: 172420, names: ['lentils'], volume: '1 cup' },
  {
    fdc: 174256,
    names: ['mung beans', 'monggo', 'munggo', 'mongo'],
    volume: '1 cup',
  },
  { fdc: 172430, names: ['peanuts', 'mani'], volume: '1 cup' },
  { fdc: 170567, names: ['almonds'], volume: '1 cup, whole', each: '1 almond' },
  { fdc: 170162, names: ['cashews', 'cashew nuts', 'kasoy'] },
  { fdc: 170150, names: ['sesame seeds', 'sesame', 'linga'], volume: '1 tbsp' },
];

// Words that only describe a food ("2 large red onions, finely chopped"), so a name can
// include them and still match. A phrase is matched as a whole: "bone in" allows
// "bone-in chicken", while "beef bones" stays unknown. A word that makes it a different food
// must not be here ("dried mango", "cooked rice", "chili leaves", "light coconut milk",
// "cold rice"); then the ingredient isn't counted unless that whole name is in FOODS.
// prettier-ignore
export const DESCRIBING_PHRASES = [
  'fresh', 'frozen', 'raw', 'uncooked', 'whole', 'large', 'medium', 'small', 'big', 'extra',
  'jumbo', 'ripe', 'chopped', 'minced', 'diced', 'sliced', 'grated', 'shredded', 'crushed',
  'cubed', 'julienned', 'peeled', 'unpeeled', 'boneless', 'skinless', 'bone in', 'skin on',
  'organic', 'local', 'native', 'red', 'white', 'yellow', 'green', 'purple', 'brown',
  'black', 'dark', 'plain', 'regular', 'lean', 'virgin', 'thin', 'thinly', 'thick',
  'finely', 'roughly', 'coarsely', 'cut', 'into', 'piece', 'pieces', 'strips', 'fillet',
  'fillets', 'sprig', 'sprigs', 'stalk', 'stalks', 'clove', 'cloves', 'root', 'kernel',
  'kernels', 'floret', 'florets', 'canned', 'drained', 'rinsed', 'washed', 'trimmed',
  'cleaned', 'deveined', 'shelled', 'halved', 'quartered', 'mashed', 'toasted', 'ground',
  'unsweetened', 'softened', 'melted', 'room temperature', 'beaten', 'meat', 'seeded',
  'deseeded', 'stemmed', 'pitted', 'cored', 'hulled', 'italian', 'thai', 'flat leaf', 'of',
];
