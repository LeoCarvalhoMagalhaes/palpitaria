// Segunda etapa de images.ts: descarta fotos cujo título não corresponde ao produto (paisagens, homônimos, etc.).
// Uso: node scripts/data/na-etiqueta/filter-images.cjs write
const fs=require('fs');const f='public/data/na-etiqueta/products.json';
const d=JSON.parse(fs.readFileSync(f,'utf8'));
const badTitle=/geograph|satellite|ch[aâ]teau|women|girl|factory|caf[eé]|hotel|church|map|station|building|castle|tower|bridge|village|river|mountain|shop|market|restaurant|portrait|festival|parade|stamp|label_circa|logo|price|karyotype|sculpture|woytuk|olympics|death|panoramio|wine|comiccon|bakery_and|trailer|\$|€/i;
const badTerm=/\d|\b(oz|lb|lbs|can|pack|ct|count|loaves|fillets?|toasty|spread|bites|homemade|original|bulk|size|variety|brand|mix|minis|serve|grade|extreme|assortment|blend|bars?|rainbow|nibs|topper|powder|spray|shake|tin|beverage|dressing|cans|cracker|syrups?|chips|buns|bears|jumbo|rollers|thins|flavors|lean|go)\b/i;
const OK1=new Set('espresso juice onion manchego milk fondue hummus crepes molasses flatbread tofu gravy rasmalai bread panini salame mochi salad kimchi sausage flautas parmesan oreo meat almond tortilla seasoning persimmons pistachios cherries peppers cheese chocolate sauce soup rice oregano'.split(' '));
const stem=w=>w.toLowerCase().replace(/[’']/g,'').replace(/(es|s)$/,'');
let kept=0,drop=0;
for(const p of d.products){ if(!p.image)continue;
  const t=decodeURIComponent(p.image.page.split('File:')[1]||'');
  const words=p.image.term.split(/\s+/);
  const titleWords=t.toLowerCase().replace(/[’']/g,'').split(/[^a-z0-9]+/).map(stem);
  const allIn=words.every(w=>w.split('-').every(x=>titleWords.includes(stem(x))||t.toLowerCase().includes(x.toLowerCase())));
  const single=words.length===1&&!p.image.term.includes('-');
  if(badTitle.test(t)||badTerm.test(p.image.term)||!allIn||(single&&!OK1.has(p.image.term.toLowerCase()))){drop++;delete p.image}else kept++}
const BAN=/Greece|Cage Free|Juici Apples|Protein Variety|Low Sodium Variety|Emergency Food|Tropical Twist|Individually Wrapped|Old Tyme Whole Grain|Seltzer|Chicken Pot Pie|Bird's Nest|Cookie Cups|Peach Cups|Idly Rice|Sona Masoori|Kraken|Buffalo Sauce|Wine Sauce|Gold Coffee|Ground Himalayan|Granola|Square|Alfredo|Raspberry$|Seasoned Seaweed|Cowboy Chili|Orgain/;for(const p of d.products)if(p.image&&BAN.test(p.name)){delete p.image;kept--}
if(process.argv[2]==='write')fs.writeFileSync(f,JSON.stringify(d));
console.log('kept',kept,'drop',drop);
for(const p of d.products)if(p.image)console.log(p.name,'|',decodeURIComponent(p.image.page.split('File:')[1]).slice(0,70))
