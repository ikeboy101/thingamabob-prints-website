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
 try{const data=JSON.parse(atob(payload.replace(/-/g,"+").replace(/_/g,"/")));return data.email===ADMIN_EMAIL&&data.exp>Date.now();}catch{return false;}
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
   return json({ok:true},{headers:{"Set-Cookie":sessionCookie(value,7*24*60*60)}});
  }
  if(path==="/api/logout"&&request.method==="POST")return json({ok:true},200,{"Set-Cookie":sessionCookie("",0)});
  if(path==="/api/session"&&request.method==="GET")return json({authenticated:await validSession(request,env)});
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
   return new Response(object.body,{headers:{"Content-Type":object.httpMetadata?.contentType||"application/octet-stream","Cache-Control":"public, max-age=31536000, immutable","ETag":object.httpEtag}});
  }
  return json({error:"Not found"},404);
 }catch(error){console.error("Thingamabob API error",error);return json({error:"Something went wrong. Please try again."},500);}
}
