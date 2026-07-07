-- ============================================================
-- Loov — product seed (run AFTER schema.sql)
-- Supabase → SQL Editor → New query → paste → Run.
-- Re-runnable: updates existing rows on conflict.
-- ============================================================

insert into public.products (id, slug, name, description, price, category, colors, sizes, emoji, card_color, is_new, stock) values
('1','organic-cotton-bodysuit','Organic Cotton Bodysuit','Ultra-soft 100% organic cotton bodysuit with snap closures. Gentle on sensitive newborn skin. Machine washable and hypoallergenic — perfect for everyday wear.',24,'body',ARRAY['White','Sage','Sand','Sky Blue'],ARRAY['0-3 Months','3-6 Months','6-9 Months','9-12 Months'],'🌿','#C8DDD8',false,15),
('2','cloud-print-blanket','Cloud Print Blanket','Dreamy cloud-patterned cotton blanket, ultra-soft and breathable. Perfect for swaddling, strolling, and cozy nap times. Generous size for growing babies.',48,'blanket',ARRAY['White & Blue','White & Sage','White & Sand'],ARRAY['80×100 cm','100×120 cm'],'☁️','#C4D4E4',false,8),
('3','hospital-exit-set','Hospital Exit Set','Complete 5-piece set for your precious homecoming day: bodysuit, romper, hat, mittens, and socks. Made from the softest organic cotton for delicate newborn skin.',89,'set',ARRAY['White','Sage','Sand'],ARRAY['0-1 Month','1-3 Months'],'🎀','#D0E0CC',true,22),
('4','bamboo-hooded-towel','Bamboo Hooded Towel','Luxuriously soft bamboo-cotton blend hooded towel. Highly absorbent and gentle on delicate skin. The adorable hood keeps baby warm and cozy after every bath.',38,'towel',ARRAY['White','Cream','Sage','Sand'],ARRAY['70×70 cm','90×90 cm'],'🛁','#E4D8C4',false,3),
('5','bear-ear-romper','Bear Ear Romper','Adorable bear ear hooded romper made from premium cotton fleece. Keeps baby warm and irresistibly cute. Easy snap closures make diaper changes quick and simple.',42,'romper',ARRAY['Beige','Sage','Blue','Lavender'],ARRAY['0-3 Months','3-6 Months','6-9 Months','9-12 Months','12-18 Months'],'🐻','#D4CAE4',true,12),
('6','mini-bunny-backpack','Mini Bunny Backpack','A precious little bunny-shaped backpack for toddlers. Perfect for daycare, park walks, and tiny adventures. Comes with a safety chest clip and soft padded straps.',58,'bag',ARRAY['Sand','Sky Blue','Cream'],ARRAY['One Size'],'🐰','#EED4BC',false,7),
('7','muslin-swaddle-blanket','Muslin Swaddle Blanket','Lightweight 100% muslin cotton swaddle blanket — breathable, soft, and gets even softer with every wash. Ideal for swaddling, nursing cover, or tummy time mat.',32,'blanket',ARRAY['White & Mint','White & Sand','White & Sage'],ARRAY['120×120 cm'],'🌸','#C8E0D8',false,18),
('8','long-sleeve-bodysuit-set','Long Sleeve Bodysuit Set (3-Pack)','Set of 3 long-sleeve organic bodysuits in coordinating neutral tones. Envelope neckline for easy dressing, flat seams inside to prevent irritation. A wardrobe staple.',58,'body',ARRAY['White','Beige','Sage'],ARRAY['0-3 Months','3-6 Months','6-9 Months','9-12 Months'],'👕','#D8E8E4',true,2),
('9','duck-hooded-towel','Duck Hooded Towel','Extra-plush terry cotton hooded towel with a cute duck-beak hood detail. Ultra-absorbent and quick-drying. Sized generously to wrap toddlers snuggly after bath time.',42,'towel',ARRAY['White','Cream','Sand'],ARRAY['90×90 cm','100×100 cm'],'🐥','#F0E4C8',false,25),
('10','panda-zip-romper','Panda Zip Romper','Sweet panda-themed zip-up romper in soft fleece. Two-way zipper for easy diaper changes at night. Hood with panda ears makes every outing extra adorable.',46,'romper',ARRAY['White','Cream','Sage'],ARRAY['0-3 Months','3-6 Months','6-9 Months','9-12 Months'],'🐼','#DCDCDC',true,11),
('11','gift-set-newborn','Newborn Gift Set','The perfect baby shower gift — 7-piece luxury set including a bodysuit, romper, blanket, bib, hat, mittens, and socks. Presented in a beautiful keepsake box.',119,'set',ARRAY['White','Sage','Sand'],ARRAY['0-1 Month','1-3 Months'],'🎁','#E0D4C8',false,6),
('12','diaper-bag-tote','Organic Diaper Bag Tote','Spacious and stylish diaper bag tote in organic canvas. 10 pockets including an insulated bottle holder and wipe-clean changing mat. Fits on stroller handles.',94,'bag',ARRAY['Beige','Sage','Sand'],ARRAY['One Size'],'👜','#D4CCBC',false,19),
('13','knotted-gown-set','Knotted Gown & Hat Set','Classic newborn knotted gown with matching hat — the easiest outfit for those early weeks. Knot at the bottom means no fumbling with snaps during middle-of-the-night changes.',36,'set',ARRAY['White','Cream','Sky Blue','Sand'],ARRAY['0-1 Month','0-3 Months'],'🎩','#CCE0DC',false,4),
('14','mini-explorer-backpack','Mini Explorer Backpack','A sturdy little backpack for curious toddlers ready to explore the world. Padded back panel, water-resistant lining, and a fun animal patch on the front.',62,'bag',ARRAY['Sky Blue','Sage','Sand'],ARRAY['One Size'],'🎒','#C8D8E8',true,14),
('15','lion-hooded-romper','Lion Hooded Romper','The king of the nursery! Plush lion-mane hood romper in ultra-soft cotton fleece. Roar-worthy comfort with full-length zip for easy dressing. Perfect for chilly days and photo sessions.',48,'romper',ARRAY['Golden','Cream','Sand'],ARRAY['0-3 Months','3-6 Months','6-9 Months','9-12 Months','12-18 Months'],'🦁','#EED4BC',true,9),
('16','bamboo-pajama-set','Bamboo Pajama Set (2-Piece)','Silky-soft 70% bamboo, 30% organic cotton 2-piece pajama set — long-sleeve top and footed pants. Thermoregulating fabric keeps baby comfortable at any temperature. Machine washable, gets softer with every wash.',54,'body',ARRAY['White','Sky Blue','Sage','Lavender'],ARRAY['0-3 Months','3-6 Months','6-9 Months','9-12 Months','12-18 Months'],'🌙','#D4CAE4',true,21),
('17','organic-sleep-sack','Organic Sleep Sack','A safe, warm sleep environment for your baby — certified safer than loose blankets. 100% organic cotton with a 1.0 TOG warmth rating. Two-way zip for nighttime diaper changes without fully waking baby.',44,'body',ARRAY['White','Sage','Sand','Sky Blue'],ARRAY['0-6 Months','6-18 Months'],'😴','#C8DDD8',false,5),
('18','rainbow-gift-set','Rainbow Baby Gift Set','A burst of soft pastel joy — 6-piece gift set with three bodysuits, a blanket, bib, and knot hat. Each piece in a different gentle rainbow shade. Presented in a keepsake gift box with ribbon.',98,'set',ARRAY['Pastel Rainbow','Neutral Rainbow'],ARRAY['0-3 Months','3-6 Months'],'🌈','#E8D8E8',true,16),
('19','terry-poncho-towel','Terry Poncho Towel','A beach-to-bath hooded poncho towel for toddlers aged 1–4 years. Premium terry cotton, extra-absorbent, with a cheerful sun embroidery on the chest. Keeps little swimmers warm and cozy.',46,'towel',ARRAY['White','Cream','Sky Blue','Sand'],ARRAY['1-2 Years','2-4 Years'],'🏖️','#EDE4C0',false,13),
('20','elephant-mini-bag','Elephant Mini Backpack','An adorably chunky elephant-shaped backpack with floppy ears and an embroidered trunk. Big enough for a snack, a toy, and all the essentials of a toddler adventure. Soft vegan leather-look fabric.',56,'bag',ARRAY['Grey','Sage','Blush'],ARRAY['One Size'],'🐘','#D8D8E8',false,20)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  category = excluded.category,
  colors = excluded.colors,
  sizes = excluded.sizes,
  emoji = excluded.emoji,
  card_color = excluded.card_color,
  is_new = excluded.is_new,
  stock = excluded.stock;
