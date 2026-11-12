import { getStore } from "@netlify/blobs";

const ADMIN_EMAIL = "thingamabobprints@gmail.com";
const store = getStore("thingamabob-site-content");

const starter = {
  settings: { etsyUrl: "https://thingamabobprints.etsy.com", instagramUrl: "", businessEmail: ADMIN_EMAIL },
  products: [
    { id:"pencil-clicker", name:"Pencil Clicker", category:"Fidget Clicker", description:"A playful pencil-inspired clicker with bold red, black and white details.", image:"assets/products/red-pencil-clicker.jpeg", featured:true },
    { id:"snowflake-clicker", name:"Snowflake Ornament Clicker", category:"Seasonal · Fidget", description:"A festive red ornament with dimensional snowflake details.", image:"assets/products/snowflake-clicker.jpeg", featured:true },
    { id:"citrus-clicker", name:"Citrus Slice Clicker", category:"Fidget Clicker", description:"A bright orange-inspired design with layered, movable-looking slices.", image:"assets/products/citrus-clicker.jpeg", featured:true },
    { id:"holiday-collection", name:"Holiday & Seasonal Creations", category:"Seasonal · Collection", description:"A variety of festive ornaments, decorations, small figures and seasonal designs made in different colors and styles.", image:"assets/products/holiday-collection.jpg", featured:true },
    { id:"pencil-keychains", name:"Pencil Keychain Clickers", category:"Fidgets · Keychains", description:"Pencil-inspired clicker keychains shown in green and red color combinations.", image:"assets/products/pencil-keychains.jpg", featured:false }
  ]
};

export default async (request, context) => {
  const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type, Authorization", "Access-Control-Allow-Methods":"GET, PUT, OPTIONS", "Content-Type":"application/json" };
  if (request.method === "OPTIONS") return new Response("", { status:204, headers:cors });
  if (request.method === "GET") {
    const saved = await store.get("content", { type:"json" });
    // If the store exists but contains no products, show the built-in starter gallery.
    const hasProducts = saved && Array.isArray(saved.products) && saved.products.length > 0;
    return new Response(JSON.stringify(hasProducts ? saved : starter), { status:200, headers:cors });
  }
  if (request.method !== "PUT") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405,headers:cors});
  const user = context?.clientContext?.user;
  if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return new Response(JSON.stringify({error:"Unauthorized"}), {status:401,headers:cors});
  }
  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers:cors}); }
  if (!body || !Array.isArray(body.products) || !body.settings) return new Response(JSON.stringify({error:"Invalid site content"}),{status:400,headers:cors});
  if (body.products.length > 200) return new Response(JSON.stringify({error:"Too many products"}),{status:400,headers:cors});
  await store.setJSON("content", body);
  return new Response(JSON.stringify({ok:true}), {status:200,headers:cors});
};
