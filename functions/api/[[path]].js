const ADMIN_EMAIL = "thingamabobprints@gmail.com";
const starter = {
  settings: {
    etsyUrl:"https://thingamabobprints.etsy.com", instagramUrl:"",
    businessEmail:ADMIN_EMAIL,
    announcementText:"THOUGHTFULLY DESIGNED · PRINTED WITH CARE · MADE TO BE ENJOYED",
    homeEyebrow:"Fun geeky 3D prints · Minnesota",
    homeTitleOne:"Made with care.", homeTitleTwo:"Made to make you smile.",
    homeDescription:"Thingamabob Prints creates fun, geeky and useful 3D-printed designs — from fidget clickers and thoughtful gifts to game accessories, organizers and one-of-a-kind custom ideas.",
    homeSectionTitle:"From playful to practical.",
    homeSectionDescription:"Browse a few examples of the things coming off our printers. There is always something new to discover.",
    customTitle:"Let's make something just for you.",
    customDescription:"Have a custom design in mind, need a particular color, or looking for a unique solution? Tell us what you're thinking and we'll talk through the possibilities.",
    aboutTitle:"Small details. Big personality.",
    aboutIntro:"Thoughtful 3D prints, playful ideas and useful creations — designed to bring a little more fun to everyday life.",
    aboutStory:"Thingamabob Prints is all about turning creative ideas into tangible things you can use, display, gift or simply enjoy."
  },
  products:[
    {id:"pencil-clicker",name:"Pencil Clicker",category:"Fidget Clicker",description:"A playful pencil-inspired clicker with bold red, black and white details.",image:"assets/products/red-pencil-clicker.jpeg",featured:true},
    {id:"snowflake-clicker",name:"Snowflake Ornament Clicker",category:"Seasonal · Fidget",description:"A festive red ornament with dimensional snowflake details.",image:"assets/products/snowflake-clicker.jpeg",featured:true},
    {id:"citrus-clicker",name:"Citrus Slice Clicker",category:"Fidget Clicker",description:"A bright orange-inspired design with layered, movable-looking slices.",image:"assets/products/citrus-clicker.jpeg",featured:true},
    {id:"holiday-collection",name:"Holiday & Seasonal Creations",category:"Seasonal · Collection",description:"A variety of festive ornaments, decorations, small figures and seasonal designs made in different colors and styles.",image:"assets/products/holiday-collection.jpg",featured:true},
    {id:"pencil-keychains",name:"Pencil Keychain Clickers",category:"Fidgets · Keychains",description:"Pencil-inspired clicker keychains shown in green and red color combinations.",image:"assets/products/pencil-keychains.jpg",featured:false}
  ]
};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...extra}});
const cookieName="thingamabob_admin";
const cookie=(request)=>Object.fromEntries((request.headers.get("Cookie")||"").split(";").map(v=>v.trim().split(/=(.*)/s).slice(0,2)).filter(v=>v.length===2))[cookieName]||"";
const b64=(bytes)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function signature(value,secret){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return b64(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));
}
async function validSession(request,env){
 if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return false;
 const parts=cookie(request).split(".");
 if(parts.length!==2)return false;
 const [payload,sig]=parts;
 if(await signature(payload,env.SESSION_SECRET)!==sig)return false;
 try{const raw=payload.replace(/-/g,"+").replace(/_/g,"/");const data=JSON.parse(atob(raw+"=".repeat((4-raw.length%4)%4)));return data.email===ADMIN_EMAIL&&data.exp>Date.now();}catch{return false;}
}
const sessionCookie=(value,maxAge)=>`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
async function getContent(env){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_content (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
 let row=await env.DB.prepare("SELECT data FROM site_content WHERE id='main'").first();
 if(!row){await env.DB.prepare("INSERT INTO site_content (id,data) VALUES ('main',?)").bind(JSON.stringify(starter)).run();return starter;}
 try{const saved=JSON.parse(row.data);return {...saved,settings:{...starter.settings,...(saved.settings||{})},products:Array.isArray(saved.products)?saved.products:starter.products};}
 catch{return starter;}
}
export async function onRequest({request,env}){
 const url=new URL(request.url),path=url.pathname;
 try{
  if(path==="/api/login"&&request.method==="POST"){
   if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return json({error:"Admin login is not configured yet."},503);
   const body=await request.json();
   if(typeof body.password!=="string"||body.password!==env.ADMIN_PASSWORD)return json({error:"Incorrect password. Please try again."},401);
   const payload=b64(new TextEncoder().encode(JSON.stringify({email:ADMIN_EMAIL,exp:Date.now()+7*24*60*60*1000})));
   const value=payload+"."+await signature(payload,env.SESSION_SECRET);
   return json({ok:true},200,{"Set-Cookie":sessionCookie(value,7*24*60*60)});
  }
  if(path==="/api/logout"&&request.method==="POST")return json({ok:true},200,{"Set-Cookie":sessionCookie("",0)});
  if(path==="/api/session"&&request.method==="GET")return json({authenticated:await validSession(request,env)});
  if(path==="/api/import-netlify"&&request.method==="POST"){
   if(!await validSession(request,env))return json({error:"Please sign in again before importing."},401);
   const source="https://majestic-elf-c90203.netlify.app/.netlify/functions/admin-data";
   const response=await fetch(source,{headers:{"Cache-Control":"no-cache"}});
   if(!response.ok)return json({error:"Could not retrieve the existing website content from Netlify."},502);
   const imported=await response.json();
   if(!imported||!Array.isArray(imported.products)||!imported.settings)return json({error:"The existing website returned invalid content."},502);
   let migratedImages=0;
   for(const product of imported.products){
    const image=product.image||"";
    const prefix="/.netlify/functions/admin-data?image=";
    if(image.startsWith(prefix)){
     const key=image.slice(prefix.length);
     if(!/^products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(key))continue;
     const oldImage=await fetch("https://majestic-elf-c90203.netlify.app"+image);
     if(!oldImage.ok)continue;
     const type=oldImage.headers.get("content-type")||"image/jpeg";
     const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"})[type.split(";")[0]]||key.split(".").pop();
     const newKey="products/"+crypto.randomUUID()+"."+ext;
     await env.IMAGES.put(newKey,await oldImage.arrayBuffer(),{httpMetadata:{contentType:type}});
     product.image="/api/images/"+newKey;
     migratedImages++;
    }
   }
   await env.DB.prepare("INSERT INTO site_content (id,data,updated_at) VALUES ('main',?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(imported)).run();
   return json({ok:true,products:imported.products.length,migratedImages});
  }
  if(path==="/api/import-gallery"&&request.method==="POST"){
   if(!await validSession(request,env))return json({error:"Please sign in again before importing."},401);
   const gallery=[{"id":"gallery-turtle-keychains","name":"Articulated Turtle Keychains","category":"Fidgets · Keychains","description":"A colorful assortment of articulated turtle keychains.","photos":["89498F59-ACF5-453D-AF33-894FB65724E8.jpg"]},{"id":"gallery-mini-character","name":"Mini Character Keychain","category":"Keychains","description":"A small character keychain with a playful blue-and-white design.","photos":["IMG_1388.jpg"]},{"id":"gallery-round-face-clickers","name":"Round Character Clickers","category":"Fidget Clickers","description":"A trio of round character-inspired clickers.","photos":["IMG_1389.jpg"]},{"id":"gallery-purple-articulated-creature","name":"Purple Articulated Creature","category":"Articulated Figures","description":"A purple articulated creature shown up close and on display.","photos":["IMG_1670.jpg","IMG_1673.jpg"]},{"id":"gallery-gingerbread-set","name":"Gingerbread Cookie Decorations","category":"Seasonal · Holiday","description":"A set of festive gingerbread-inspired decorations.","photos":["IMG_1790.jpg","IMG_2007.jpg"]},{"id":"gallery-pink-articulated-creature","name":"Pink Articulated Creature","category":"Articulated Figures","description":"A bright pink articulated creature with orange accents.","photos":["IMG_1965.jpg"]},{"id":"gallery-snowman-clicker","name":"Snowman Clicker","category":"Fidget Clickers · Seasonal","description":"A cheerful snowman-shaped clicker.","photos":["IMG_2058.jpg"]},{"id":"gallery-articulated-lizard","name":"Blue & Green Articulated Lizard","category":"Articulated Figures","description":"A colorful articulated lizard figure.","photos":["IMG_2084.jpg"]},{"id":"gallery-turtle-shell-clicker","name":"Turtle Shell Clicker","category":"Fidget Clickers","description":"A turtle-shell-inspired clicker with a segmented top.","photos":["IMG_2354.jpg"]},{"id":"gallery-display-board","name":"3D Printed Display Board","category":"Displays & Organization","description":"A freestanding display board shown from two angles.","photos":["IMG_3991.jpg","IMG_3992.jpg"]},{"id":"gallery-spider-keychain","name":"Spider Keychain","category":"Keychains","description":"A dark spider-inspired keychain.","photos":["IMG_3997.jpg"]},{"id":"gallery-flag-keychain","name":"USA Flag Keychain","category":"Keychains","description":"A red, white and blue flag keychain.","photos":["IMG_4020.jpg"]},{"id":"gallery-pixel-monster-keychain","name":"Pixel Monster Keychain","category":"Keychains · Gaming","description":"A green pixel-style monster keychain.","photos":["IMG_4026.jpg"]},{"id":"gallery-silhouette-keychain","name":"Animal Silhouette Keychain","category":"Keychains","description":"A white animal silhouette keychain.","photos":["IMG_4058.jpg"]},{"id":"gallery-oval-emblem-keychain","name":"Oval Emblem Keychain","category":"Keychains","description":"A small oval emblem-style keychain.","photos":["IMG_4090.jpg"]},{"id":"gallery-dog-keychain","name":"Dog Keychain","category":"Keychains","description":"A cute dog-shaped keychain.","photos":["IMG_4116.jpg"]},{"id":"gallery-green-ogre-keychain","name":"Green Ogre Keychain","category":"Keychains · Characters","description":"A green ogre character keychain.","photos":["IMG_4298.jpg"]},{"id":"gallery-waffle-keychain","name":"Waffle Keychain","category":"Keychains · Food","description":"A golden waffle-shaped keychain.","photos":["IMG_4419.jpg"]},{"id":"gallery-spider-hero-keychain","name":"Spider Hero Keychain","category":"Keychains · Characters","description":"A red spider-themed character keychain.","photos":["IMG_4443.jpg"]},{"id":"gallery-turtle-keychain","name":"Turtle Keychain","category":"Keychains · Animals","description":"A turtle-shaped keychain with a colorful shell.","photos":["IMG_4608.jpg"]},{"id":"gallery-octopus-keychain","name":"Octopus Keychain","category":"Keychains · Animals","description":"A white octopus-shaped keychain.","photos":["IMG_5647.jpg"]},{"id":"gallery-pumpkin-keychain","name":"Pumpkin Keychain","category":"Keychains · Seasonal","description":"An orange pumpkin-shaped keychain.","photos":["IMG_5679.jpg"]},{"id":"gallery-cat-clicker","name":"Green Cat Clicker","category":"Fidget Clickers","description":"A bright green cat-shaped clicker.","photos":["IMG_5699.jpg"]},{"id":"gallery-ghost-pumpkin-keychain","name":"Ghost & Pumpkin Keychain","category":"Keychains · Seasonal","description":"A friendly ghost holding a pumpkin.","photos":["IMG_5751.jpg"]},{"id":"gallery-lightsaber-keychains","name":"Lightsaber Keychains","category":"Keychains · Sci-Fi","description":"A pair of miniature lightsaber-inspired keychains.","photos":["IMG_5989.jpg"]},{"id":"gallery-seasonal-keychain-assortment","name":"Seasonal & Holiday Keychain Assortment","category":"Seasonal · Collection","description":"An assortment of colorful seasonal and holiday-themed designs.","photos":["IMG_6002.jpg"]},{"id":"gallery-gingerbread-figures","name":"Gingerbread Figure Set","category":"Seasonal · Holiday","description":"A set of small gingerbread-inspired figures.","photos":["IMG_6006.jpg"]},{"id":"gallery-cinnamon-roll-clicker","name":"Cinnamon Roll Clicker","category":"Fidget Clickers · Food","description":"A cinnamon-roll-inspired clicker.","photos":["IMG_6098.jpg"]},{"id":"gallery-r2d2-keychain","name":"Astromech Droid Keychain","category":"Keychains · Sci-Fi","description":"A blue-and-white droid-inspired keychain.","photos":["IMG_6140.jpg"]},{"id":"gallery-round-droid-keychain","name":"Round Droid Keychain","category":"Keychains · Sci-Fi","description":"A small round droid-inspired keychain.","photos":["IMG_6142.jpg"]},{"id":"gallery-turtle-clicker","name":"Articulated Turtle Clicker","category":"Fidget Clickers · Animals","description":"An articulated turtle clicker shown in two color combinations.","photos":["IMG_8638.jpg","IMG_8640.jpg"]},{"id":"gallery-mini-cup-set","name":"Miniature Coffee Cup Set","category":"Miniatures · Food & Drink","description":"A set of miniature coffee cups in assorted designs.","photos":["IMG_8707.jpg"]}];
   const saved=await getContent(env);
   const added=[];
   for(const item of gallery){
    if(saved.products.some(p=>p.id===item.id))continue;
    const keys=item.photos.map(name=>"products/"+name);
    const existing=[];
    for(const key of keys){const object=await env.IMAGES.head(key);if(object)existing.push("/api/images/"+key);}
    if(!existing.length)continue;
    saved.products.push({id:item.id,name:item.name,category:item.category,description:item.description,image:existing[0],additionalImages:existing.slice(1),featured:false,digitalAvailable:false,digitalUrl:"",digitalPriceType:"purchasable",physicalAvailable:false,etsyUrl:""});
    added.push(item.name);
   }
   await env.DB.prepare("INSERT INTO site_content (id,data,updated_at) VALUES ('main',?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(saved)).run();
   return json({ok:true,added:added.length,products:added});
  }
  if(path==="/api/admin-data"&&request.method==="GET")return json(await getContent(env));
  if(path==="/api/admin-data"&&request.method==="PUT"){
   if(!await validSession(request,env))return json({error:"Your admin session expired. Please sign in again."},401);
   const body=await request.json();
   if(!body||!Array.isArray(body.products)||!body.settings||body.products.length>200)return json({error:"Invalid website content."},400);
   await env.DB.prepare("INSERT INTO site_content (id,data,updated_at) VALUES ('main',?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(body)).run();
   const check=await env.DB.prepare("SELECT data FROM site_content WHERE id='main'").first();
   if(!check||check.data!==JSON.stringify(body))return json({error:"The save could not be verified. Please try again."},500);
   return json({ok:true,verified:true});
  }
  if(path==="/api/admin-data"&&request.method==="POST"){
   if(!await validSession(request,env))return json({error:"Your admin session expired. Please sign in again."},401);
   const form=await request.formData(),file=form.get("file");
   if(!(file instanceof File)||!file.size)return json({error:"Choose an image file first."},400);
   const allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
   const ext=allowed[file.type];if(!ext)return json({error:"Please use JPG, PNG, WebP or GIF."},415);
   if(file.size>8*1024*1024)return json({error:"Images must be 8 MB or smaller."},413);
   const key="products/"+crypto.randomUUID()+"."+ext;
   await env.IMAGES.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
   return json({ok:true,image:"/api/images/"+key},201);
  }
  if(path.startsWith("/api/images/")&&request.method==="GET"){
   const key=path.slice("/api/images/".length);
   if(!/^products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(key))return new Response("Not found",{status:404});
   const object=await env.IMAGES.get(key);
   if(!object)return new Response("Not found",{status:404});
   const ext=key.split(".").pop().toLowerCase();
   const mimeByExt={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"};
   const contentType=object.httpMetadata?.contentType||mimeByExt[ext]||"application/octet-stream";
   return new Response(object.body,{headers:{"Content-Type":contentType,"Cache-Control":"public, max-age=3600","ETag":object.httpEtag}});
  }
  return json({error:"Not found"},404);
 }catch(error){console.error("Thingamabob API error",error);return json({error:"Something went wrong. Please try again."},500);}
}
