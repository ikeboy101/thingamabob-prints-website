
// SITE SETTINGS — replace these values before publishing.
const SITE_SETTINGS = {
  etsyUrl: "https://thingamabobprints.etsy.com",
  instagramUrl: "",     // Example: https://www.instagram.com/yourhandle/
  businessEmail: "thingamabobprints@gmail.com"
};
document.querySelectorAll('[data-link="etsy"]').forEach(a=>{
  a.href=SITE_SETTINGS.etsyUrl || "#";
  a.addEventListener('click',e=>{if(!SITE_SETTINGS.etsyUrl){e.preventDefault();alert("Add your Etsy shop URL in assets/site.js to activate this link.");}});
});
document.querySelectorAll('[data-link="instagram"]').forEach(a=>{
  a.href=SITE_SETTINGS.instagramUrl || "#";
  a.addEventListener('click',e=>{if(!SITE_SETTINGS.instagramUrl){e.preventDefault();alert("Add your Instagram URL in assets/site.js to activate this link.");}});
});

async function applyWebsiteSettings(){
 try{
  const response=await fetch('/api/admin-data', {cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json(),s=data.settings||{};
  if(s.businessEmail)SITE_SETTINGS.businessEmail=s.businessEmail;
  if(s.etsyUrl)SITE_SETTINGS.etsyUrl=s.etsyUrl;
  document.querySelectorAll('.announcement').forEach(el=>{if(s.announcementText)el.textContent=s.announcementText;});
  const fields=['homeEyebrow','homeTitleOne','homeTitleTwo','homeDescription','homeSectionTitle','homeSectionDescription','customTitle','customDescription','aboutTitle','aboutIntro','aboutStory'];
  fields.forEach(key=>{const el=document.querySelector('[data-edit="'+key+'"]');if(el&&s[key])el.textContent=s[key];});
  if(s.businessEmail)document.querySelectorAll('[data-email]').forEach(el=>{el.textContent=s.businessEmail;el.href='mailto:'+s.businessEmail;});
  if(s.etsyUrl)document.querySelectorAll('[data-etsy]').forEach(el=>el.href=s.etsyUrl);
 }catch(error){console.warn('Website settings unavailable',error);}
}
applyWebsiteSettings();

const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
const filters=document.getElementById('filters');
if(filters){filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filters.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));b.classList.add('active');const f=b.dataset.filter;document.querySelectorAll('#galleryGrid .product-card').forEach(c=>c.style.display=(f==='all'||c.dataset.category===f)?'':'none');});}
function mailForm(id,subjectField,bodyField){
 const form=document.getElementById(id); if(!form)return;
 form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);const subject=subjectField(d);const body=bodyField(d);if(!SITE_SETTINGS.businessEmail){alert('The contact form is ready, but the business email address has not been added yet. Please contact us through Etsy for now.');return;}window.location.href='mailto:'+SITE_SETTINGS.businessEmail+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);});
}
mailForm('contactForm',d=>d.get('reason')||'Website inquiry',d=>`Name: ${d.get('name')}
Email: ${d.get('email')}
Topic: ${d.get('reason')}

${d.get('details')}`);

async function loadManagedContent(){
 try{
  const response=await fetch('/api/admin-data',{cache:'no-store'});
  if(!response.ok)return;
  const content=await response.json();
  const products=Array.isArray(content.products)?content.products:[];
  const makeCard=(p,link)=>{const article=document.createElement('article');article.className='product-card premium-product-card';const a=document.createElement('a');a.href=link;const imageWrap=document.createElement('div');imageWrap.className='product-img';const img=document.createElement('img');img.src=p.image||'';img.alt=p.name||'Thingamabob Prints product';img.loading='lazy';imageWrap.append(img);const info=document.createElement('div');info.className='product-info';const tag=document.createElement('span');tag.className='tag';tag.textContent=p.category||'3D PRINT';const title=document.createElement('h3');title.textContent=p.name||'';const desc=document.createElement('p');desc.textContent=p.description||'';const bottom=document.createElement('div');bottom.className='product-bottom';const label=document.createElement('span');label.textContent='View in gallery';const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';bottom.append(label,arrow);info.append(tag,title,desc,bottom);a.append(imageWrap,info);article.append(a);return article;};
  const gallery=document.getElementById('galleryGrid');
  if(gallery){gallery.replaceChildren(...products.map(p=>makeCard(p,'#')));}
  const home=document.querySelector('.home-products');
  if(home){const featured=products.filter(p=>p.featured).slice(0,4);if(featured.length)home.replaceChildren(...featured.map(p=>makeCard(p,'gallery.html')));}
  if(content.settings?.etsyUrl){document.querySelectorAll('a[href*="thingamabobprints.etsy.com"]').forEach(a=>a.href=content.settings.etsyUrl);}
 }catch(error){console.warn('Managed site content unavailable; showing built-in content.',error);}
}
loadManagedContent();
