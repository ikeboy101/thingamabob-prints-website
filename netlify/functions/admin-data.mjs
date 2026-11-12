import { getStore } from "@netlify/blobs";

const ADMIN_EMAIL = "thingamabobprints@gmail.com";
const store = getStore("thingamabob-site-content");
const imageStore = getStore("thingamabob-product-images");

const starter = {
  settings: { etsyUrl: "https://thingamabobprints.etsy.com", instagramUrl: "", businessEmail: ADMIN_EMAIL, announcementText:"THOUGHTFULLY DESIGNED · PRINTED WITH CARE · MADE TO BE ENJOYED", homeEyebrow:"Fun geeky 3D prints · Minnesota", homeTitleOne:"Made with care.", homeTitleTwo:"Made to make you smile.", homeDescription:"Thingamabob Prints creates fun, geeky and useful 3D-printed designs — from fidget clickers and thoughtful gifts to game accessories, organizers and one-of-a-kind custom ideas.", homeSectionTitle:"From playful to practical.", homeSectionDescription:"Browse a few examples of the things coming off our printers. There is always something new to discover.", customTitle:"Let's make something just for you.", customDescription:"Have a custom design in mind, need a particular color, or looking for a unique solution? Tell us what you're thinking and we'll talk through the possibilities.", aboutTitle:"Small details. Big personality.", aboutIntro:"Thoughtful 3D prints, playful ideas and useful creations — designed to bring a little more fun to everyday life.", aboutStory:"Thingamabob Prints is all about turning creative ideas into tangible things you can use, display, gift or simply enjoy." },
  products: [
    { id:"pencil-clicker", name:"Pencil Clicker", category:"Fidget Clicker", description:"A playful pencil-inspired clicker with bold red, black and white details.", image:"assets/products/red-pencil-clicker.jpeg", featured:true },
    { id:"snowflake-clicker", name:"Snowflake Ornament Clicker", category:"Seasonal · Fidget", description:"A festive red ornament with dimensional snowflake details.", image:"assets/products/snowflake-clicker.jpeg", featured:true },
    { id:"citrus-clicker", name:"Citrus Slice Clicker", category:"Fidget Clicker", description:"A bright orange-inspired design with layered, movable-looking slices.", image:"assets/products/citrus-clicker.jpeg", featured:true },
    { id:"holiday-collection", name:"Holiday & Seasonal Creations", category:"Seasonal · Collection", description:"A variety of festive ornaments, decorations, small figures and seasonal designs made in different colors and styles.", image:"assets/products/holiday-collection.jpg", featured:true },
    { id:"pencil-keychains", name:"Pencil Keychain Clickers", category:"Fidgets · Keychains", description:"Pencil-inspired clicker keychains shown in green and red color combinations.", image:"assets/products/pencil-keychains.jpg", featured:false }
  ]
};

async function authorizedUser(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  try {
    const response = await fetch(new URL("/.netlify/identity/user", request.url), { headers: { Authorization: authorization } });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? user : null;
  } catch (error) {
    console.error("Could not verify Netlify Identity session", error);
    return null;
  }
}

export default async (request) => {
  const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type, Authorization", "Access-Control-Allow-Methods":"GET, PUT, POST, OPTIONS" };
  if (request.method === "OPTIONS") return new Response("", { status:204, headers:cors });

  const url = new URL(request.url);
  const imageKey = url.searchParams.get("image");
  if (request.method === "GET" && imageKey) {
    if (!/^products\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(imageKey)) return new Response("Not found", { status:404, headers:cors });
    const entry = await imageStore.getWithMetadata(imageKey, { type:"arrayBuffer", consistency:"strong" });
    if (!entry) return new Response("Not found", { status:404, headers:cors });
    return new Response(entry.data, { status:200, headers:{ ...cors, "Content-Type":entry.metadata?.contentType || "application/octet-stream", "Cache-Control":"public, max-age=31536000, immutable" } });
  }

  if (request.method === "GET") {
    const saved = await store.get("content", { type:"json" });
    const hasProducts = saved && Array.isArray(saved.products) && saved.products.length > 0;
    const responseContent = hasProducts ? { ...saved, settings:{ ...starter.settings, ...(saved.settings || {}) } } : starter;
    return new Response(JSON.stringify(responseContent), { status:200, headers:{ ...cors, "Content-Type":"application/json" } });
  }

  if (request.method !== "PUT" && request.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405,headers:{ ...cors, "Content-Type":"application/json" }});

  const user = await authorizedUser(request);
  if (!user) return new Response(JSON.stringify({error:"Your admin session could not be verified. Please sign in again."}), {status:401,headers:{ ...cors, "Content-Type":"application/json" }});

  if (request.method === "POST") {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || !file.size) return new Response(JSON.stringify({error:"Choose an image file first."}), {status:400,headers:{ ...cors, "Content-Type":"application/json" }});
      const allowed = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/gif":"gif" };
      const extension = allowed[file.type];
      if (!extension) return new Response(JSON.stringify({error:"Please use a JPG, PNG, WebP or GIF image."}), {status:415,headers:{ ...cors, "Content-Type":"application/json" }});
      if (file.size > 8 * 1024 * 1024) return new Response(JSON.stringify({error:"Images must be 8 MB or smaller."}), {status:413,headers:{ ...cors, "Content-Type":"application/json" }});
      const key = `products/${crypto.randomUUID()}.${extension}`;
      await imageStore.set(key, file, { metadata:{ contentType:file.type, uploadedBy:user.email } });
      return new Response(JSON.stringify({ ok:true, image:`/.netlify/functions/admin-data?image=${key}` }), {status:201,headers:{ ...cors, "Content-Type":"application/json" }});
    } catch (error) {
      console.error("Image upload failed", error);
      return new Response(JSON.stringify({error:"The image could not be uploaded. Please try again."}), {status:500,headers:{ ...cors, "Content-Type":"application/json" }});
    }
  }

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({error:"Invalid JSON"}),{status:400,headers:{ ...cors, "Content-Type":"application/json" }}); }
  if (!body || !Array.isArray(body.products) || !body.settings) return new Response(JSON.stringify({error:"Invalid site content"}),{status:400,headers:{ ...cors, "Content-Type":"application/json" }});
  if (body.products.length > 200) return new Response(JSON.stringify({error:"Too many products"}),{status:400,headers:{ ...cors, "Content-Type":"application/json" }});
  await store.setJSON("content", body);
  return new Response(JSON.stringify({ok:true}), {status:200,headers:{ ...cors, "Content-Type":"application/json" }});
};
