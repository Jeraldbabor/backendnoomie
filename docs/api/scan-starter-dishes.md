# Starter dishes

The [food scan](scan.md) finds a dish by comparing the photo with example photos of it. So
that it knows common dishes from the start, the backend comes with **42 Filipino dishes**,
loaded by `npm run db:seed:dishes` (see [run the backend](../setup/local-backend.md)). Each is
a Noomie editorial recipe (`author: null`), with ingredients and steps so
[nutrition](nutrition.md) works, and about 5 example photos.

The example photos come from Wikimedia Commons, under open licenses only (CC0, public domain,
CC BY, CC BY-SA). The seed downloads each one once to make its fingerprint and keeps only the
fingerprint: the photos aren't stored, shown in the app, or shared. They are credited below.

## What the app sees

- Starter dishes appear in scan results like any other recipe. They have no photo of their
  own (`photo: null`), so show the usual placeholder.
- Users teach them like any other match: choosing one from the results adds that scan as one
  more example.
- They also appear in recipe lists, search and Discover, as editorial recipes.

## How well it works

Measured on 2026-11-10 by scanning each of the 212 example photos against all the others
(with its own fingerprint removed), as a new photo of that dish would be:

| Result                                              | Share         |
| --------------------------------------------------- | ------------- |
| The right dish is among the matches shown (up to 3) | 83% (176/212) |
| The closest match is the right dish                 | 67% (141/212) |
| `strong` matches that are the right dish            | 83% (97/117)  |
| `possible` matches that are the right dish          | 46% (41/89)   |

- **Best known:** pancit palabok, puto, tapsilog, paksiw na isda and sapin-sapin (5 of 5).
- **Weakest:** Bicol express (0 of 5), and pork sisig, chicken inasal and bistek Tagalog (1 of
  5). Brown stews, creamy stews and grilled meats look alike in photos.
- **These numbers are optimistic.** Several photos of a dish often come from the same
  photographer and meal. Phone photos of other plates do worse: in a check with three phone
  screenshots, lumpia was found (`possible`, 0.82) but beef caldereta came up as chicken adobo.
- **It improves with use.** Every time a user picks a match, that photo becomes one more
  example of the dish ([teach the scan](scan.md#teach-the-scan-post-apiv1scanscanidconfirm-signed-in)).

## The dishes

Chicken adobo, Lumpiang Shanghai, Sinigang na baboy, Kare-kare, Lechon kawali, Pancit canton, Pancit bihon, Pancit palabok, Pork sisig, Halo-halo, Bibingka, Leche flan, Chicken tinola, Beef caldereta, Turon, Bicol express, Pinakbet, Arroz caldo, Champorado, Bulalo, Puto, Pork tocino, Longganisa, Chicken inasal, Dinuguan, Chicken afritada, Ginisang monggo, Kinilaw na isda, Bistek Tagalog, Ensaymada, Pandesal, Buko pie, Taho, Ube halaya, Tapsilog, Nilagang baka, Paksiw na isda, Kutsinta, Sapin-sapin, Pancit molo, Ginataang bilo-bilo, Lumpiang sariwa.

## Photo credits

Each line is the file on Wikimedia Commons, its author, and its license. To change the list,
edit `prisma/starter-dishes/` and this page together; `starter-dishes.spec.ts` checks that
they agree.

### Chicken adobo

- [Chicken adobo.jpg](https://commons.wikimedia.org/wiki/File:Chicken_adobo.jpg), dbgg1979 on flickr, CC BY 2.0
- [Adobo Filipino sa 'gata'.jpg](https://commons.wikimedia.org/wiki/File:Adobo_Filipino_sa_'gata'.jpg), Dandy1022, CC BY-SA 3.0
- [Chicken adobo with potato.jpg](https://commons.wikimedia.org/wiki/File:Chicken_adobo_with_potato.jpg), Irvin Parco Sto. Tomas, CC BY-SA 4.0
- [Chicken Adobo with Potatoes.jpg](https://commons.wikimedia.org/wiki/File:Chicken_Adobo_with_Potatoes.jpg), Kabu Sawsaw, CC BY-SA 4.0
- [Chicken adobo meal 20231025.jpg](https://commons.wikimedia.org/wiki/File:Chicken_adobo_meal_20231025.jpg), Ian Lopez (Ianlopez1115), CC BY-SA 4.0
- [Filipino Chicken Adobo with rice.jpg](https://commons.wikimedia.org/wiki/File:Filipino_Chicken_Adobo_with_rice.jpg), Obsidian Soul, CC BY-SA 3.0
- [Homemade chicken adobo 1.JPG](https://commons.wikimedia.org/wiki/File:Homemade_chicken_adobo_1.JPG), BrokenSphere, CC BY-SA 3.0
- [Chicken Adobo over rice.jpg](https://commons.wikimedia.org/wiki/File:Chicken_Adobo_over_rice.jpg), Jack Lawrence, CC BY 2.0

### Lumpiang Shanghai

- [Girl With Shanghai Rolls.jpg](https://commons.wikimedia.org/wiki/File:Girl_With_Shanghai_Rolls.jpg), D. Sharon Pruitt, CC BY 2.0
- [0181sjfCuisine of Bulacan foodsfvf.jpg](https://commons.wikimedia.org/wiki/File:0181sjfCuisine_of_Bulacan_foodsfvf.jpg), Judgefloro, CC0
- [03400jfCuisine of Bulacanfvf 07.jpg](https://commons.wikimedia.org/wiki/File:03400jfCuisine_of_Bulacanfvf_07.jpg), Judgefloro, CC0
- [100Cuisine of Bulacan 04.jpg](https://commons.wikimedia.org/wiki/File:100Cuisine_of_Bulacan_04.jpg), Judgefloro, CC0
- [100Cuisine of Bulacan 06.jpg](https://commons.wikimedia.org/wiki/File:100Cuisine_of_Bulacan_06.jpg), Judgefloro, CC0

### Sinigang na baboy

- [08757jfCuisine of Bulacan foodsfvf 30.jpg](https://commons.wikimedia.org/wiki/File:08757jfCuisine_of_Bulacan_foodsfvf_30.jpg), Judgefloro, CC0
- [08757jfCuisine of Bulacan foodsfvf 32.jpg](https://commons.wikimedia.org/wiki/File:08757jfCuisine_of_Bulacan_foodsfvf_32.jpg), Judgefloro, CC0
- [01092jfCuisine Foods Fruits Philippines Baliuag Bulacanfvf 01.jpg](https://commons.wikimedia.org/wiki/File:01092jfCuisine_Foods_Fruits_Philippines_Baliuag_Bulacanfvf_01.jpg), Judgefloro, CC0
- [0274Cuisine of the Philippines Foods Meals 01.jpg](https://commons.wikimedia.org/wiki/File:0274Cuisine_of_the_Philippines_Foods_Meals_01.jpg), Judgefloro, CC0
- [0274Cuisine of the Philippines Foods Meals 03.jpg](https://commons.wikimedia.org/wiki/File:0274Cuisine_of_the_Philippines_Foods_Meals_03.jpg), Judgefloro, CC0

### Kare-kare

- [02292jfHoly Wednesday Good Friday processions Baliuag Bulacan Augustine Parish Churchfvf 01.JPG](https://commons.wikimedia.org/wiki/File:02292jfHoly_Wednesday_Good_Friday_processions_Baliuag_Bulacan_Augustine_Parish_Churchfvf_01.JPG), Judgefloro, Public domain
- [0700 jfCuisine of Bulacan foods and fruits homefvf 05.jpg](https://commons.wikimedia.org/wiki/File:0700_jfCuisine_of_Bulacan_foods_and_fruits_homefvf_05.jpg), Judgefloro, Public domain
- [0395jfCuisine of Bulacan Fried itik pugo pancitfvf 18.jpg](https://commons.wikimedia.org/wiki/File:0395jfCuisine_of_Bulacan_Fried_itik_pugo_pancitfvf_18.jpg), Judgefloro, CC0
- [02859jfCuisine of Bulacan foodfvf 04.jpg](https://commons.wikimedia.org/wiki/File:02859jfCuisine_of_Bulacan_foodfvf_04.jpg), Judgefloro, CC0
- [01566jfPuto Pao Ube Puto Fried tilapia Lugaw plain Kare-karefvf 08.jpg](https://commons.wikimedia.org/wiki/File:01566jfPuto_Pao_Ube_Puto_Fried_tilapia_Lugaw_plain_Kare-karefvf_08.jpg), Judgefloro, CC0

### Lechon kawali

- [019354jfCuisine of Bulacanfvf.jpg](https://commons.wikimedia.org/wiki/File:019354jfCuisine_of_Bulacanfvf.jpg), Judgefloro, CC0
- [05223jfPhilippine cuisine dishes Bulacafvf 06.jpg](https://commons.wikimedia.org/wiki/File:05223jfPhilippine_cuisine_dishes_Bulacafvf_06.jpg), Judgefloro, CC0
- [05239jfFoods of Bulacan Philippinesfvf 19.jpg](https://commons.wikimedia.org/wiki/File:05239jfFoods_of_Bulacan_Philippinesfvf_19.jpg), Judgefloro, CC0
- [09764jfFilipino cuisine foods desserts breads Landmarks Bulacanfvf 28.jpg](https://commons.wikimedia.org/wiki/File:09764jfFilipino_cuisine_foods_desserts_breads_Landmarks_Bulacanfvf_28.jpg), Judgefloro, CC0
- [09764jfFilipino cuisine foods desserts breads Landmarks Bulacanfvf 30.jpg](https://commons.wikimedia.org/wiki/File:09764jfFilipino_cuisine_foods_desserts_breads_Landmarks_Bulacanfvf_30.jpg), Judgefloro, CC0

### Pancit canton

- [0700 jfCuisine of Bulacan foods and fruits homefvf 02.jpg](https://commons.wikimedia.org/wiki/File:0700_jfCuisine_of_Bulacan_foods_and_fruits_homefvf_02.jpg), Judgefloro, Public domain
- [0700 jfCuisine of Bulacan foods and fruits homefvf 12.jpg](https://commons.wikimedia.org/wiki/File:0700_jfCuisine_of_Bulacan_foods_and_fruits_homefvf_12.jpg), Judgefloro, Public domain
- [09949ccjfCuisine of Bulacan pancit Spaghettifvf.jpg](https://commons.wikimedia.org/wiki/File:09949ccjfCuisine_of_Bulacan_pancit_Spaghettifvf.jpg), Judgefloro, CC0
- [0702jfPancit, Cuisine of Bulacan food fruitsfvf 05.jpg](https://commons.wikimedia.org/wiki/File:0702jfPancit%2C_Cuisine_of_Bulacan_food_fruitsfvf_05.jpg), Judgefloro, CC0
- [09422jfCabalen restaurants food products buffets in Bulacan Philippinesfvf 04.jpg](https://commons.wikimedia.org/wiki/File:09422jfCabalen_restaurants_food_products_buffets_in_Bulacan_Philippinesfvf_04.jpg), Judgefloro, CC0

### Pancit bihon

- [Pancit bijon.jpg](https://commons.wikimedia.org/wiki/File:Pancit_bijon.jpg), Foodista, CC BY 2.0
- [03050jfTia Elena's Restaurant DRT Highway Sabang Baliuag Bulacanfvf 03.jpg](https://commons.wikimedia.org/wiki/File:03050jfTia_Elena's_Restaurant_DRT_Highway_Sabang_Baliuag_Bulacanfvf_03.jpg), Judgefloro, CC0
- [6516Cuisine of Baliuag 02.jpg](https://commons.wikimedia.org/wiki/File:6516Cuisine_of_Baliuag_02.jpg), Judgefloro, CC0
- [9952Poblacion, Baliuag, Bulacan 03.jpg](https://commons.wikimedia.org/wiki/File:9952Poblacion%2C_Baliuag%2C_Bulacan_03.jpg), Judgefloro, CC0
- [3268Baliuag, Bulacan during the COVID-47 pandemic.jpg](https://commons.wikimedia.org/wiki/File:3268Baliuag%2C_Bulacan_during_the_COVID-47_pandemic.jpg), Judgefloro, CC0

### Pancit palabok

- [03368jfNagwaling Diwa National Roads Welcome Pilar Bataanfvf 26.JPG](https://commons.wikimedia.org/wiki/File:03368jfNagwaling_Diwa_National_Roads_Welcome_Pilar_Bataanfvf_26.JPG), Judgefloro, Public domain
- [03143jfMacArthur Highway Tabang Guiguinto Bulacanfvf 08.jpg](https://commons.wikimedia.org/wiki/File:03143jfMacArthur_Highway_Tabang_Guiguinto_Bulacanfvf_08.jpg), Judgefloro, Public domain
- [0357jfPats Pancit Palabok Lugawfvf 03.jpg](https://commons.wikimedia.org/wiki/File:0357jfPats_Pancit_Palabok_Lugawfvf_03.jpg), Judgefloro, Public domain
- [0357jfPats Pancit Palabok Lugawfvf 02.jpg](https://commons.wikimedia.org/wiki/File:0357jfPats_Pancit_Palabok_Lugawfvf_02.jpg), Judgefloro, Public domain
- [0316jfPancit malabon Pampangafvf 11.jpg](https://commons.wikimedia.org/wiki/File:0316jfPancit_malabon_Pampangafvf_11.jpg), Judgefloro, CC0

### Pork sisig

- [Denciosisig.jpg](https://commons.wikimedia.org/wiki/File:Denciosisig.jpg), Self, CC BY 3.0
- [Honored to work alongside Chef Miguel Trinidad (@chefmigsnyc) of NY's Maharlika and Jeepney at -SavorFilipino. Sisig was KILLER! -FilipinoFood -DeathBySisig (14901309648).jpg](https://commons.wikimedia.org/wiki/File:Honored_to_work_alongside_Chef_Miguel_Trinidad_%28%40chefmigsnyc%29_of_NY's_Maharlika_and_Jeepney_at_-SavorFilipino._Sisig_was_KILLER!_-FilipinoFood_-DeathBySisig_%2814901309648%29.jpg), Arnold Gatilao from Oakland, CA, USA, CC BY 2.0
- [0001jfPhilippine cuisine dishes Baliuag Bulacafvf 49.jpg](https://commons.wikimedia.org/wiki/File:0001jfPhilippine_cuisine_dishes_Baliuag_Bulacafvf_49.jpg), Judgefloro, CC0
- [07097jfCuisine of the Philippines Dishes Restaurants Foodsfvf 06.jpg](https://commons.wikimedia.org/wiki/File:07097jfCuisine_of_the_Philippines_Dishes_Restaurants_Foodsfvf_06.jpg), Judgefloro, CC0
- [06555jfCandaba, Pampanga Market Fishes Foods Landmarksfvf 17.jpg](https://commons.wikimedia.org/wiki/File:06555jfCandaba%2C_Pampanga_Market_Fishes_Foods_Landmarksfvf_17.jpg), Judgefloro, CC0

### Halo-halo

- [05239jfFoods of Bulacan Philippinesfvf 25.jpg](https://commons.wikimedia.org/wiki/File:05239jfFoods_of_Bulacan_Philippinesfvf_25.jpg), Judgefloro, CC0
- [Halo Halo.jpg](https://commons.wikimedia.org/wiki/File:Halo_Halo.jpg), MannyT1629, CC BY-SA 4.0
- [Halo Halo x2.jpg](https://commons.wikimedia.org/wiki/File:Halo_Halo_x2.jpg), MannyT1629, CC BY-SA 4.0
- [4963Baliuag Bulacan Landmarks during the 2020 coronavirus pandemic 09.jpg](https://commons.wikimedia.org/wiki/File:4963Baliuag_Bulacan_Landmarks_during_the_2020_coronavirus_pandemic_09.jpg), Judgefloro, CC0
- [4963Baliuag Bulacan Landmarks during the 2020 coronavirus pandemic 10.jpg](https://commons.wikimedia.org/wiki/File:4963Baliuag_Bulacan_Landmarks_during_the_2020_coronavirus_pandemic_10.jpg), Judgefloro, CC0

### Bibingka

- [09323jfCuyapo Districts One Seven Cuisine Halls Nueva Ecijafvf 27.JPG](https://commons.wikimedia.org/wiki/File:09323jfCuyapo_Districts_One_Seven_Cuisine_Halls_Nueva_Ecijafvf_27.JPG), Judgefloro, Public domain
- [09343jfSan Juan City Aquinas School Bibingka Puto Kabayanan Tibagan Streetsfvf 20.jpg](https://commons.wikimedia.org/wiki/File:09343jfSan_Juan_City_Aquinas_School_Bibingka_Puto_Kabayanan_Tibagan_Streetsfvf_20.jpg), Judgefloro, Public domain
- [09343jfSan Juan City Aquinas School Bibingka Puto Kabayanan Tibagan Streetsfvf 19.jpg](https://commons.wikimedia.org/wiki/File:09343jfSan_Juan_City_Aquinas_School_Bibingka_Puto_Kabayanan_Tibagan_Streetsfvf_19.jpg), Judgefloro, Public domain
- [09836jfBarangays Rice cakes puto bibingka Poblacion Mandaluyong Cityfvf 04.jpg](https://commons.wikimedia.org/wiki/File:09836jfBarangays_Rice_cakes_puto_bibingka_Poblacion_Mandaluyong_Cityfvf_04.jpg), Judgefloro, CC0

### Leche flan

- [Leche flan Filipinas.jpg](https://commons.wikimedia.org/wiki/File:Leche_flan_Filipinas.jpg), Jeanne Tiong, CC BY 2.0
- [0002jfDesserts Pampanga Philippinesfvf 07.JPG](https://commons.wikimedia.org/wiki/File:0002jfDesserts_Pampanga_Philippinesfvf_07.JPG), Judgefloro, CC BY-SA 4.0
- [Leche flan from the Philippines.jpg](https://commons.wikimedia.org/wiki/File:Leche_flan_from_the_Philippines.jpg), Obsidian Soul, CC0
- [Custard Mamon (Philippines).jpg](https://commons.wikimedia.org/wiki/File:Custard_Mamon_%28Philippines%29.jpg), Obsidian Soul, CC0
- [Leche Flan 01.jpg](https://commons.wikimedia.org/wiki/File:Leche_Flan_01.jpg), Marife.altabano, CC BY-SA 4.0

### Chicken tinola

- [Tinolalunch.jpg](https://commons.wikimedia.org/wiki/File:Tinolalunch.jpg), FoxLad at English Wikipedia, CC BY 3.0
- [Tinola0046lfvf 02.JPG](https://commons.wikimedia.org/wiki/File:Tinola0046lfvf_02.JPG), Judgefloro, CC BY-SA 4.0
- [0088jfNovo Department Store Plaridel Bulacanfvf 03.jpg](https://commons.wikimedia.org/wiki/File:0088jfNovo_Department_Store_Plaridel_Bulacanfvf_03.jpg), Judgefloro, Public domain
- [1004Cuisine of the Philippines 10.jpg](https://commons.wikimedia.org/wiki/File:1004Cuisine_of_the_Philippines_10.jpg), Judgefloro, CC0
- [9826Tinolang manok 01.jpg](https://commons.wikimedia.org/wiki/File:9826Tinolang_manok_01.jpg), Judgefloro, CC0

### Beef caldereta

- [La infausta caldereta de pescado y mariscos... @ La Goleta, UY.jpg](https://commons.wikimedia.org/wiki/File:La_infausta_caldereta_de_pescado_y_mariscos..._%40_La_Goleta%2C_UY.jpg), robertorodriguex, CC BY-SA 2.0
- [Goat caldereta (Philippines) 02.jpg](https://commons.wikimedia.org/wiki/File:Goat_caldereta_%28Philippines%29_02.jpg), Obsidian Soul, CC0
- [Caldereta de cordero-Ávila.jpg](https://commons.wikimedia.org/wiki/File:Caldereta_de_cordero-%C3%81vila.jpg), Xemenendura, CC BY-SA 4.0
- [03114jfCuisine of Bulacan caldereta minced vegetablesfvf 03.jpg](https://commons.wikimedia.org/wiki/File:03114jfCuisine_of_Bulacan_caldereta_minced_vegetablesfvf_03.jpg), Judgefloro, CC0
- [03114jfCuisine of Bulacan caldereta minced vegetablesfvf 01.jpg](https://commons.wikimedia.org/wiki/File:03114jfCuisine_of_Bulacan_caldereta_minced_vegetablesfvf_01.jpg), Judgefloro, CC0

### Turon

- [0001jfPhilippine cuisine dishes Baliuag Bulacafvf 42.jpg](https://commons.wikimedia.org/wiki/File:0001jfPhilippine_cuisine_dishes_Baliuag_Bulacafvf_42.jpg), Judgefloro, CC0
- [05269jfFoods of Bulacan Philippinesfvf 38.jpg](https://commons.wikimedia.org/wiki/File:05269jfFoods_of_Bulacan_Philippinesfvf_38.jpg), Judgefloro, CC0
- [05269jfFoods of Bulacan Philippinesfvf 45.jpg](https://commons.wikimedia.org/wiki/File:05269jfFoods_of_Bulacan_Philippinesfvf_45.jpg), Judgefloro, CC0
- [09300jfBarangays Caloocan Longos Malabon Avenues Landmarks Roadsfvf 13.jpg](https://commons.wikimedia.org/wiki/File:09300jfBarangays_Caloocan_Longos_Malabon_Avenues_Landmarks_Roadsfvf_13.jpg), Judgefloro, CC0
- [09402jfBarangays Caloocan Longos Malabon Avenues Landmarks Roadsfvf 34.jpg](https://commons.wikimedia.org/wiki/File:09402jfBarangays_Caloocan_Longos_Malabon_Avenues_Landmarks_Roadsfvf_34.jpg), Judgefloro, CC0

### Bicol express

- [Bicol Express.jpg](https://commons.wikimedia.org/wiki/File:Bicol_Express.jpg), Raymund Macaalay, CC BY-SA 3.0
- [0001jfPhilippine cuisine dishes Baliuag Bulacafvf 25.jpg](https://commons.wikimedia.org/wiki/File:0001jfPhilippine_cuisine_dishes_Baliuag_Bulacafvf_25.jpg), Judgefloro, CC0
- [0001jfPhilippine cuisine dishes Baliuag Bulacafvf 46.jpg](https://commons.wikimedia.org/wiki/File:0001jfPhilippine_cuisine_dishes_Baliuag_Bulacafvf_46.jpg), Judgefloro, CC0
- [07212jfPulilan Market foods kakanin landmarksfvf 12.jpg](https://commons.wikimedia.org/wiki/File:07212jfPulilan_Market_foods_kakanin_landmarksfvf_12.jpg), Judgefloro, CC0
- [6416Cuisine of Baliwag 03.jpg](https://commons.wikimedia.org/wiki/File:6416Cuisine_of_Baliwag_03.jpg), Judgefloro, CC0

### Pinakbet

- [Pakbetjf9853.JPG](https://commons.wikimedia.org/wiki/File:Pakbetjf9853.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [Pakbet4.jpg](https://commons.wikimedia.org/wiki/File:Pakbet4.jpg), Ringer, CC BY-SA 3.0
- [09383jfCabalen restaurants food products buffets in Bulacan Philippinesfvf 38.jpg](https://commons.wikimedia.org/wiki/File:09383jfCabalen_restaurants_food_products_buffets_in_Bulacan_Philippinesfvf_38.jpg), Judgefloro, CC0
- [3268Baliuag, Bulacan during the COVID-44 pandemic.jpg](https://commons.wikimedia.org/wiki/File:3268Baliuag%2C_Bulacan_during_the_COVID-44_pandemic.jpg), Judgefloro, CC0
- [6741Baliuag Bulacan Landmarks during 2020 coronavirus pandemic 06.jpg](https://commons.wikimedia.org/wiki/File:6741Baliuag_Bulacan_Landmarks_during_2020_coronavirus_pandemic_06.jpg), Judgefloro, CC0

### Arroz caldo

- [CarmelChapeljf9707 30.JPG](https://commons.wikimedia.org/wiki/File:CarmelChapeljf9707_30.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [FvfCasaRoces9264 35.JPG](https://commons.wikimedia.org/wiki/File:FvfCasaRoces9264_35.JPG), Judgefloro, Public domain
- [01759jfSan Jose Juan Vicente, San Miguel, Bulacan Market Roadfvf 14.jpg](https://commons.wikimedia.org/wiki/File:01759jfSan_Jose_Juan_Vicente%2C_San_Miguel%2C_Bulacan_Market_Roadfvf_14.jpg), Judgefloro, CC0
- [07495jfCuisine Breads Fruits Baliuag Landmarks Bulacanfvf 40.jpg](https://commons.wikimedia.org/wiki/File:07495jfCuisine_Breads_Fruits_Baliuag_Landmarks_Bulacanfvf_40.jpg), Judgefloro, CC0
- [07495jfCuisine Breads Fruits Baliuag Landmarks Bulacanfvf 42.jpg](https://commons.wikimedia.org/wiki/File:07495jfCuisine_Breads_Fruits_Baliuag_Landmarks_Bulacanfvf_42.jpg), Judgefloro, CC0

### Champorado

- [Champorado.jpg](https://commons.wikimedia.org/wiki/File:Champorado.jpg), Josh James from Imus, Philippines, CC BY 2.0
- [Champorado2.jpg](https://commons.wikimedia.org/wiki/File:Champorado2.jpg), Sean Bonus from USA, CC BY 2.0
- [Champorado3.jpg](https://commons.wikimedia.org/wiki/File:Champorado3.jpg), Raelene Gutierrez from Sydney, Australia, CC BY 2.0
- [07543jfCuisine Breads Foods Fruits Baliuag Bulacanfvf 06.jpg](https://commons.wikimedia.org/wiki/File:07543jfCuisine_Breads_Foods_Fruits_Baliuag_Bulacanfvf_06.jpg), Judgefloro, CC0
- [07543jfCuisine Breads Foods Fruits Baliuag Bulacanfvf 07.jpg](https://commons.wikimedia.org/wiki/File:07543jfCuisine_Breads_Foods_Fruits_Baliuag_Bulacanfvf_07.jpg), Judgefloro, CC0

### Bulalo

- [Bulalo.jpg](https://commons.wikimedia.org/wiki/File:Bulalo.jpg), Yvette Tan, CC BY 2.0
- [Bulalo, Pamana. (Philippines).jpg](https://commons.wikimedia.org/wiki/File:Bulalo%2C_Pamana._%28Philippines%29.jpg), Yvette Tan, CC BY 2.0
- [Bulalo (Philippines).jpg](https://commons.wikimedia.org/wiki/File:Bulalo_%28Philippines%29.jpg), Obsidian Soul, CC0
- [Bulalo 2.jpg](https://commons.wikimedia.org/wiki/File:Bulalo_2.jpg), Marife.altabano, CC BY-SA 4.0
- [Bulalo at Baguio City, Dec 2023.jpg](https://commons.wikimedia.org/wiki/File:Bulalo_at_Baguio_City%2C_Dec_2023.jpg), Ralff Nestor Nacor, CC BY-SA 4.0

### Puto

- [09734jfSabang Halls Welcome Caingin Creek Bridge San Rafael Bulacanfvf 09.JPG](https://commons.wikimedia.org/wiki/File:09734jfSabang_Halls_Welcome_Caingin_Creek_Bridge_San_Rafael_Bulacanfvf_09.JPG), Judgefloro, Public domain
- [01281jfBustos Chapels Welcome Cakes Schools Cambaog Bulacanfvf 30.JPG](https://commons.wikimedia.org/wiki/File:01281jfBustos_Chapels_Welcome_Cakes_Schools_Cambaog_Bulacanfvf_30.JPG), Judgefloro, Public domain
- [09883JfBaliuag San Roque Niño Paddy Fields Roads Bulacanfvf 25.JPG](https://commons.wikimedia.org/wiki/File:09883JfBaliuag_San_Roque_Ni%C3%B1o_Paddy_Fields_Roads_Bulacanfvf_25.JPG), Judgefloro, Public domain
- [09883JfBaliuag San Roque Niño Paddy Fields Roads Bulacanfvf 24.JPG](https://commons.wikimedia.org/wiki/File:09883JfBaliuag_San_Roque_Ni%C3%B1o_Paddy_Fields_Roads_Bulacanfvf_24.JPG), Judgefloro, Public domain
- [03127jfMacArthur Highway Cupcakes Tabang Guiguinto Bulacanfvf 08.jpg](https://commons.wikimedia.org/wiki/File:03127jfMacArthur_Highway_Cupcakes_Tabang_Guiguinto_Bulacanfvf_08.jpg), Judgefloro, Public domain

### Pork tocino

- [05981jfCuisine of Bulacanfvf 09.JPG](https://commons.wikimedia.org/wiki/File:05981jfCuisine_of_Bulacanfvf_09.JPG), Judgefloro, Public domain
- [Pork tocino with eggs, rice, and atchara (typical Filipino breakfast).jpg](https://commons.wikimedia.org/wiki/File:Pork_tocino_with_eggs%2C_rice%2C_and_atchara_%28typical_Filipino_breakfast%29.jpg), Obsidian Soul, CC BY-SA 4.0
- [09367jfCabalen restaurants food products buffets in Bulacan Philippinesfvf 05.jpg](https://commons.wikimedia.org/wiki/File:09367jfCabalen_restaurants_food_products_buffets_in_Bulacan_Philippinesfvf_05.jpg), Judgefloro, CC0
- [09481jfCuisine Foods Fruits Philippines Baliuag Bulacanfvf 36.jpg](https://commons.wikimedia.org/wiki/File:09481jfCuisine_Foods_Fruits_Philippines_Baliuag_Bulacanfvf_36.jpg), Judgefloro, CC0
- [09481jfCuisine Foods Fruits Philippines Baliuag Bulacanfvf 37.jpg](https://commons.wikimedia.org/wiki/File:09481jfCuisine_Foods_Fruits_Philippines_Baliuag_Bulacanfvf_37.jpg), Judgefloro, CC0

### Longganisa

- [09899jfCuisine of Bulacan foodsfvf 04.JPG](https://commons.wikimedia.org/wiki/File:09899jfCuisine_of_Bulacan_foodsfvf_04.JPG), Judgefloro, Public domain
- [09212jfBarangays Veterans Village Bungad Paltok Project 13 Quezon Cityfvf.jpg](https://commons.wikimedia.org/wiki/File:09212jfBarangays_Veterans_Village_Bungad_Paltok_Project_13_Quezon_Cityfvf.jpg), Judgefloro, Public domain
- [09171jfMuseo Quinguia Santiago Apostol Church Plaridel Bulacanfvf 18.jpg](https://commons.wikimedia.org/wiki/File:09171jfMuseo_Quinguia_Santiago_Apostol_Church_Plaridel_Bulacanfvf_18.jpg), Judgefloro, Public domain
- [0682jfLonganisa fruits and vegetables Cuisine of Bulacanfvf 03.jpg](https://commons.wikimedia.org/wiki/File:0682jfLonganisa_fruits_and_vegetables_Cuisine_of_Bulacanfvf_03.jpg), Judgefloro, CC0
- [0682jfLonganisa fruits and vegetables Cuisine of Bulacanfvf 04.jpg](https://commons.wikimedia.org/wiki/File:0682jfLonganisa_fruits_and_vegetables_Cuisine_of_Bulacanfvf_04.jpg), Judgefloro, CC0

### Chicken inasal

- [CaintaRizaljf9963 13.JPG](https://commons.wikimedia.org/wiki/File:CaintaRizaljf9963_13.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [Manginasalmeal.jpg](https://commons.wikimedia.org/wiki/File:Manginasalmeal.jpg), Self, CC BY 3.0
- [Chicken Inasal.JPG](https://commons.wikimedia.org/wiki/File:Chicken_Inasal.JPG), Elmer B. Domingo, CC BY-SA 3.0
- [9780Chicken Inasal 03.jpg](https://commons.wikimedia.org/wiki/File:9780Chicken_Inasal_03.jpg), JFVelasquez Floro, CC BY-SA 4.0
- [0740Foods dishes delicacies of Bulacan 30.jpg](https://commons.wikimedia.org/wiki/File:0740Foods_dishes_delicacies_of_Bulacan_30.jpg), JFVelasquez Floro, CC0

### Dinuguan

- [Dinuguan2.jpg](https://commons.wikimedia.org/wiki/File:Dinuguan2.jpg), User:Eneasmarquez, Public domain
- [Dinuguanjf.JPG](https://commons.wikimedia.org/wiki/File:Dinuguanjf.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [09383jfCabalen restaurants food products buffets in Bulacan Philippinesfvf 24.jpg](https://commons.wikimedia.org/wiki/File:09383jfCabalen_restaurants_food_products_buffets_in_Bulacan_Philippinesfvf_24.jpg), Judgefloro, CC0
- [0205jfCuisine of the Philippinesfvf 06.jpg](https://commons.wikimedia.org/wiki/File:0205jfCuisine_of_the_Philippinesfvf_06.jpg), Judgefloro, CC0
- [0001jfPhilippine cuisine dishes Baliuag Bulacafvf 28.jpg](https://commons.wikimedia.org/wiki/File:0001jfPhilippine_cuisine_dishes_Baliuag_Bulacafvf_28.jpg), Judgefloro, CC0

### Chicken afritada

- [Buffetjf9441 06.JPG](https://commons.wikimedia.org/wiki/File:Buffetjf9441_06.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [09383jfCabalen restaurants food products buffets in Bulacan Philippinesfvf 25.jpg](https://commons.wikimedia.org/wiki/File:09383jfCabalen_restaurants_food_products_buffets_in_Bulacan_Philippinesfvf_25.jpg), Judgefloro, CC0
- [0050jfCuisine Foods Philippines Baliuag Bulacanfvf 16.jpg](https://commons.wikimedia.org/wiki/File:0050jfCuisine_Foods_Philippines_Baliuag_Bulacanfvf_16.jpg), Judgefloro, CC0
- [0050jfCuisine Foods Philippines Baliuag Bulacanfvf 18.jpg](https://commons.wikimedia.org/wiki/File:0050jfCuisine_Foods_Philippines_Baliuag_Bulacanfvf_18.jpg), Judgefloro, CC0
- [Chicken Afritada on white rice with pineapple tidbits (Philippines).jpg](https://commons.wikimedia.org/wiki/File:Chicken_Afritada_on_white_rice_with_pineapple_tidbits_%28Philippines%29.jpg), Jo Paragas, CC BY 2.0

### Ginisang monggo

- [09455jfSan Rafael Bulacan Diliman Paddy Halls Roadsfvf 24.JPG](https://commons.wikimedia.org/wiki/File:09455jfSan_Rafael_Bulacan_Diliman_Paddy_Halls_Roadsfvf_24.JPG), Judgefloro, Public domain
- [09016jfCuisine of Bulacanfvf 06.JPG](https://commons.wikimedia.org/wiki/File:09016jfCuisine_of_Bulacanfvf_06.JPG), Judgefloro, Public domain
- [09560jfCuisine of Bulacan foodsfvf 03.jpg](https://commons.wikimedia.org/wiki/File:09560jfCuisine_of_Bulacan_foodsfvf_03.jpg), Judgefloro, Public domain
- [09927jfCuisine of Bulacan food fruitsfvf 17.jpg](https://commons.wikimedia.org/wiki/File:09927jfCuisine_of_Bulacan_food_fruitsfvf_17.jpg), Judgefloro, CC0
- [09530jfGinisang mungo and Pancitfvf 04.jpg](https://commons.wikimedia.org/wiki/File:09530jfGinisang_mungo_and_Pancitfvf_04.jpg), Judgefloro, CC0

### Kinilaw na isda

- [Kinilaw.jpg](https://commons.wikimedia.org/wiki/File:Kinilaw.jpg), (JW) from Philippines, CC BY 2.0
- [Fish kinilaw.JPG](https://commons.wikimedia.org/wiki/File:Fish_kinilaw.JPG), Jdcgumpal, CC BY-SA 3.0
- [Cebu Food Trip (11051272795).jpg](https://commons.wikimedia.org/wiki/File:Cebu_Food_Trip_%2811051272795%29.jpg), RM Bulseco from Davao City, Philippines, CC BY 2.0
- [Kinilaw (Philippine Ceviche).jpg](https://commons.wikimedia.org/wiki/File:Kinilaw_%28Philippine_Ceviche%29.jpg), Obsidian Soul, CC0
- [Vikings Kinilaw, At Vikings Megamall.jpg](https://commons.wikimedia.org/wiki/File:Vikings_Kinilaw%2C_At_Vikings_Megamall.jpg), Rodel Bontes, CC BY-SA 2.0

### Bistek Tagalog

- [Bistek Tagalog-01.jpg](https://commons.wikimedia.org/wiki/File:Bistek_Tagalog-01.jpg), Arnold Gatilao, CC BY 2.0
- [Bistek Tagalog-02.jpg](https://commons.wikimedia.org/wiki/File:Bistek_Tagalog-02.jpg), Arnold Gatilao, CC BY 2.0
- [BistekMexDF.JPG](https://commons.wikimedia.org/wiki/File:BistekMexDF.JPG), AlejandroLinaresGarcia, CC BY-SA 4.0
- [Bistek Tagalog - skirt steak, caramelized onions, and calamansi-soy sauce (14629656223).jpg](https://commons.wikimedia.org/wiki/File:Bistek_Tagalog_-_skirt_steak%2C_caramelized_onions%2C_and_calamansi-soy_sauce_%2814629656223%29.jpg), Arnold Gatilao from Oakland, CA, USA, CC BY 2.0
- [Bistektagalogonplate.jpg](https://commons.wikimedia.org/wiki/File:Bistektagalogonplate.jpg), Self, CC BY 3.0

### Ensaymada

- [Large Ensaymada.jpg](https://commons.wikimedia.org/wiki/File:Large_Ensaymada.jpg), roland on flickr, CC BY 2.0
- [Ensaymada.JPG](https://commons.wikimedia.org/wiki/File:Ensaymada.JPG), Iamraincrystal, CC BY-SA 3.0
- [Ensaimada Bread Pudding with creme anglaise -ensaimada -ensaymada -FilipinoFoodMovement -Filipino -FilipinoFood (16926043528).jpg](https://commons.wikimedia.org/wiki/File:Ensaimada_Bread_Pudding_with_creme_anglaise_-ensaimada_-ensaymada_-FilipinoFoodMovement_-Filipino_-FilipinoFood_%2816926043528%29.jpg), Arnold Gatilao from Oakland, CA, USA, CC BY 2.0
- [Ensaymada from -ValeriosBakery (15379638761).jpg](https://commons.wikimedia.org/wiki/File:Ensaymada_from_-ValeriosBakery_%2815379638761%29.jpg), Arnold Gatilao from Oakland, CA, USA, CC BY 2.0
- [0135jfCuisine Breads Foods Fruits Baliuag Bulacanfvf 16.jpg](https://commons.wikimedia.org/wiki/File:0135jfCuisine_Breads_Foods_Fruits_Baliuag_Bulacanfvf_16.jpg), Judgefloro, CC0

### Pandesal

- [07185jfFoods Desserts Breads Cuisine of the Philippinesfvf 31.jpg](https://commons.wikimedia.org/wiki/File:07185jfFoods_Desserts_Breads_Cuisine_of_the_Philippinesfvf_31.jpg), Judgefloro, CC0
- [07185jfFoods Desserts Breads Cuisine of the Philippinesfvf 34.jpg](https://commons.wikimedia.org/wiki/File:07185jfFoods_Desserts_Breads_Cuisine_of_the_Philippinesfvf_34.jpg), Judgefloro, CC0
- [07185jfFoods Desserts Breads Cuisine of the Philippinesfvf 35.jpg](https://commons.wikimedia.org/wiki/File:07185jfFoods_Desserts_Breads_Cuisine_of_the_Philippinesfvf_35.jpg), Judgefloro, CC0
- [09714jfFilipino cuisine foods desserts breads Landmarks Bulacanfvf 13.jpg](https://commons.wikimedia.org/wiki/File:09714jfFilipino_cuisine_foods_desserts_breads_Landmarks_Bulacanfvf_13.jpg), Judgefloro, CC0
- [09806jfFilipino cuisine foods desserts breads Landmarks Bulacanfvf 11.jpg](https://commons.wikimedia.org/wiki/File:09806jfFilipino_cuisine_foods_desserts_breads_Landmarks_Bulacanfvf_11.jpg), Judgefloro, CC0

### Buko pie

- [Buko (coconut) pie from the Philippines 2.jpg](https://commons.wikimedia.org/wiki/File:Buko_%28coconut%29_pie_from_the_Philippines_2.jpg), Obsidian Soul, CC0
- [Buko pie (Philippines).jpg](https://commons.wikimedia.org/wiki/File:Buko_pie_%28Philippines%29.jpg), Krista, CC BY 2.0
- [How to Making Egg Pie.jpg](https://commons.wikimedia.org/wiki/File:How_to_Making_Egg_Pie.jpg), Jp Figueros Tv, CC BY-SA 4.0
- [Buko pie BagabagA.jpg](https://commons.wikimedia.org/wiki/File:Buko_pie_BagabagA.jpg), Unknown author, CC BY-SA 4.0
- [Buko pie Bagabag Tuao NorthB.jpg](https://commons.wikimedia.org/wiki/File:Buko_pie_Bagabag_Tuao_NorthB.jpg), Unknown author, CC BY-SA 4.0

### Taho

- [Taho2.jpg](https://commons.wikimedia.org/wiki/File:Taho2.jpg), w:en:User:Kguirnela, CC BY 2.5
- [TahoShakeMaginhawa.jpg](https://commons.wikimedia.org/wiki/File:TahoShakeMaginhawa.jpg), Regina Ilustre, CC BY-SA 3.0
- [3777Taho street vendors Baliuag Philippines 11.jpg](https://commons.wikimedia.org/wiki/File:3777Taho_street_vendors_Baliuag_Philippines_11.jpg), Judgefloro, CC0
- [3777Taho street vendors Baliuag Philippines 12.jpg](https://commons.wikimedia.org/wiki/File:3777Taho_street_vendors_Baliuag_Philippines_12.jpg), Judgefloro, CC0
- [Taho, Apr 2024.jpg](https://commons.wikimedia.org/wiki/File:Taho%2C_Apr_2024.jpg), Ralff Nestor Nacor, CC BY-SA 4.0

### Ube halaya

- [Ube halaya (Ube jam) with condensed milk.jpg](https://commons.wikimedia.org/wiki/File:Ube_halaya_%28Ube_jam%29_with_condensed_milk.jpg), Obsidian Soul, CC BY-SA 3.0
- [0002jfDesserts Pampanga Philippinesfvf 08.JPG](https://commons.wikimedia.org/wiki/File:0002jfDesserts_Pampanga_Philippinesfvf_08.JPG), Judgefloro, CC BY-SA 4.0
- [Ube halaya.jpg](https://commons.wikimedia.org/wiki/File:Ube_halaya.jpg), Obsidian Soul, CC0
- [Ube001.jpg](https://commons.wikimedia.org/wiki/File:Ube001.jpg), Televido, CC BY-SA 4.0
- [Ube002.jpg](https://commons.wikimedia.org/wiki/File:Ube002.jpg), Televido, CC BY-SA 4.0

### Tapsilog

- [867Cuisine foods of Bulacan 14.jpg](https://commons.wikimedia.org/wiki/File:867Cuisine_foods_of_Bulacan_14.jpg), Judgefloro, CC0
- [Beef tapa with steamed rice and sliced tomato and cucumber.jpg](https://commons.wikimedia.org/wiki/File:Beef_tapa_with_steamed_rice_and_sliced_tomato_and_cucumber.jpg), Efrenefren, CC BY-SA 4.0
- [9171Foods Fruits Bulacan 10.jpg](https://commons.wikimedia.org/wiki/File:9171Foods_Fruits_Bulacan_10.jpg), Judgefloro, CC0
- [Food & Local Flavors 1.jpg](https://commons.wikimedia.org/wiki/File:Food_%26_Local_Flavors_1.jpg), LuzViMindaLife, CC BY-SA 4.0
- [Tapsilog 01.jpg](https://commons.wikimedia.org/wiki/File:Tapsilog_01.jpg), Marife.altabano, CC BY-SA 4.0

### Nilagang baka

- [01092jfCuisine Foods Fruits Philippines Baliuag Bulacanfvf 06.jpg](https://commons.wikimedia.org/wiki/File:01092jfCuisine_Foods_Fruits_Philippines_Baliuag_Bulacanfvf_06.jpg), Judgefloro, CC0
- [01092jfCuisine Foods Fruits Philippines Baliuag Bulacanfvf 07.jpg](https://commons.wikimedia.org/wiki/File:01092jfCuisine_Foods_Fruits_Philippines_Baliuag_Bulacanfvf_07.jpg), Judgefloro, CC0
- [9627Foods in Baliuag Bulacan 06.jpg](https://commons.wikimedia.org/wiki/File:9627Foods_in_Baliuag_Bulacan_06.jpg), Judgefloro, CC0
- [9627Foods in Baliuag Bulacan 07.jpg](https://commons.wikimedia.org/wiki/File:9627Foods_in_Baliuag_Bulacan_07.jpg), Judgefloro, CC0
- [Filipino nilagang manok1.jpg](https://commons.wikimedia.org/wiki/File:Filipino_nilagang_manok1.jpg), Unknown author, CC BY-SA 4.0

### Paksiw na isda

- [Paksiwjf.JPG](https://commons.wikimedia.org/wiki/File:Paksiwjf.JPG), Ramon FVelasquez, CC0
- [Bangusjf1816 01.JPG](https://commons.wikimedia.org/wiki/File:Bangusjf1816_01.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [JfMalhacan9018MeycauayanCityfvf 06.JPG](https://commons.wikimedia.org/wiki/File:JfMalhacan9018MeycauayanCityfvf_06.JPG), Judgefloro, CC BY-SA 4.0
- [JfBaliuag9814foodfvf 06.JPG](https://commons.wikimedia.org/wiki/File:JfBaliuag9814foodfvf_06.JPG), Judgefloro, CC BY-SA 4.0
- [09764jfFilipino cuisine foods desserts breads Landmarks Bulacanfvf 17.jpg](https://commons.wikimedia.org/wiki/File:09764jfFilipino_cuisine_foods_desserts_breads_Landmarks_Bulacanfvf_17.jpg), Judgefloro, CC0

### Kutsinta

- [Putocuchintajf.JPG](https://commons.wikimedia.org/wiki/File:Putocuchintajf.JPG), Ramon FVelasquez, CC BY-SA 3.0
- [09883JfBaliuag San Roque Niño Paddy Fields Roads Bulacanfvf 26.JPG](https://commons.wikimedia.org/wiki/File:09883JfBaliuag_San_Roque_Ni%C3%B1o_Paddy_Fields_Roads_Bulacanfvf_26.JPG), Judgefloro, Public domain
- [09883JfBaliuag San Roque Niño Paddy Fields Roads Bulacanfvf 27.JPG](https://commons.wikimedia.org/wiki/File:09883JfBaliuag_San_Roque_Ni%C3%B1o_Paddy_Fields_Roads_Bulacanfvf_27.JPG), Judgefloro, Public domain
- [0255jfCaloocan City Barangays Streets Grace Park Manilafvf 05.jpg](https://commons.wikimedia.org/wiki/File:0255jfCaloocan_City_Barangays_Streets_Grace_Park_Manilafvf_05.jpg), Judgefloro, Public domain
- [6603Cuisine of Bulacan 12.jpg](https://commons.wikimedia.org/wiki/File:6603Cuisine_of_Bulacan_12.jpg), Judgefloro, CC0

### Sapin-sapin

- [JfDolorskakaninfvf 02.JPG](https://commons.wikimedia.org/wiki/File:JfDolorskakaninfvf_02.JPG), Judgefloro, CC BY-SA 4.0
- [0103jfConcepcion Baritan Malabon City Landmarksfvf 13.jpg](https://commons.wikimedia.org/wiki/File:0103jfConcepcion_Baritan_Malabon_City_Landmarksfvf_13.jpg), Judgefloro, CC0
- [0103jfConcepcion Baritan Malabon City Landmarksfvf 14.jpg](https://commons.wikimedia.org/wiki/File:0103jfConcepcion_Baritan_Malabon_City_Landmarksfvf_14.jpg), Judgefloro, CC0
- [09814jfFilipino foods fruits Bulacan landmarksfvf 47.jpg](https://commons.wikimedia.org/wiki/File:09814jfFilipino_foods_fruits_Bulacan_landmarksfvf_47.jpg), Judgefloro, CC0
- [09814jfFilipino foods fruits Bulacan landmarksfvf 48.jpg](https://commons.wikimedia.org/wiki/File:09814jfFilipino_foods_fruits_Bulacan_landmarksfvf_48.jpg), Judgefloro, CC0

### Pancit molo

- [Cafe Roces Molo.jpg](https://commons.wikimedia.org/wiki/File:Cafe_Roces_Molo.jpg), Yvette Tan, CC BY 2.0
- [Iloilo Pancit Molo.jpg](https://commons.wikimedia.org/wiki/File:Iloilo_Pancit_Molo.jpg), Herbertkikoy, CC BY-SA 4.0
- [Camiña’s Balay Na Bato Pancit Molo 2.jpg](https://commons.wikimedia.org/wiki/File:Cami%C3%B1a%E2%80%99s_Balay_Na_Bato_Pancit_Molo_2.jpg), Herbertkikoy, CC BY-SA 4.0
- [Camiña’s Balay Na Bato Pancit Molo 1.jpg](https://commons.wikimedia.org/wiki/File:Cami%C3%B1a%E2%80%99s_Balay_Na_Bato_Pancit_Molo_1.jpg), Herbertkikoy, CC BY-SA 4.0
- [Iloilo's Pancit Molo.jpg](https://commons.wikimedia.org/wiki/File:Iloilo's_Pancit_Molo.jpg), Mhlayson, CC BY-SA 4.0

### Ginataang bilo-bilo

- [Ginataan01.JPG](https://commons.wikimedia.org/wiki/File:Ginataan01.JPG), Viktor Medrano;, CC BY-SA 3.0
- [Ginataan001.jpg](https://commons.wikimedia.org/wiki/File:Ginataan001.jpg), Televido, CC BY-SA 4.0
- [Ginataan004.jpg](https://commons.wikimedia.org/wiki/File:Ginataan004.jpg), Televido, CC BY-SA 4.0
- [Ginataan005.jpg](https://commons.wikimedia.org/wiki/File:Ginataan005.jpg), Televido, CC BY-SA 4.0
- [Ginataang Bilu-Bilo 001.jpg](https://commons.wikimedia.org/wiki/File:Ginataang_Bilu-Bilo_001.jpg), Televido, CC BY-SA 4.0

### Lumpiang sariwa

- [Fresh lumpia.jpg](https://commons.wikimedia.org/wiki/File:Fresh_lumpia.jpg), Kguirnela, CC BY 3.0
- [Lumpiang ubod (Filipino heart of palm spring roll).jpg](https://commons.wikimedia.org/wiki/File:Lumpiang_ubod_%28Filipino_heart_of_palm_spring_roll%29.jpg), punctuated, CC BY 2.0
- [2013 Angeles Philippines Trip Day 5 - Lumpiang Ubod.jpg](https://commons.wikimedia.org/wiki/File:2013_Angeles_Philippines_Trip_Day_5_-_Lumpiang_Ubod.jpg), tofuprod, CC BY-SA 2.0
- [8280Photos taken during 2020 coronavirus pandemic Baliuag 24.jpg](https://commons.wikimedia.org/wiki/File:8280Photos_taken_during_2020_coronavirus_pandemic_Baliuag_24.jpg), Judgefloro, CC0
- [8280Photos taken during 2020 coronavirus pandemic Baliuag 26.jpg](https://commons.wikimedia.org/wiki/File:8280Photos_taken_during_2020_coronavirus_pandemic_Baliuag_26.jpg), Judgefloro, CC0
