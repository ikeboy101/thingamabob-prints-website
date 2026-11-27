
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
  const collectionRules={
   fidget:/clicker|fidget/i,
   flexi:/articulated|flexi|turtle|lizard|creature|octopus/i,
   keychains:/keychain/i,
   holiday:/holiday|seasonal|gingerbread|snowman|snowflake|pumpkin|ornament/i,
   organizers:/organiz|accessor|display|stand/i
  };
  const getProductCollections=p=>{
   if(Array.isArray(p.collections))return p.collections.filter(key=>Object.prototype.hasOwnProperty.call(collectionRules,key));
   const text=[p.name,p.category,p.description].filter(Boolean).join(" ");
   return Object.entries(collectionRules).filter(([,pattern])=>pattern.test(text)).map(([key])=>key);
  };
  const safeProductLink=value=>{try{const u=new URL(value,window.location.href);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
  const makeCard=(p,link,isGallery=false)=>{const article=document.createElement('article');article.className=isGallery?'gallery-item':'product-card premium-product-card';if(isGallery)article.dataset.collections=getProductCollections(p).join(' ');const imageWrap=document.createElement(isGallery?'button':'div');imageWrap.className=isGallery?'gallery-image-button product-img':'product-img';if(isGallery){imageWrap.type='button';imageWrap.setAttribute('aria-label','View purchase options for '+(p.name||'product'));}const img=document.createElement('img');img.src=p.image||'';img.alt=p.name||'Thingamabob Prints product';img.loading='lazy';imageWrap.append(img);if(isGallery){const badges=document.createElement('div');badges.className='product-availability-badges';if(p.digitalAvailable){const b=document.createElement('span');b.className='availability-badge digital';b.textContent='↓ DIGITAL';badges.append(b);}if(p.physicalAvailable){const b=document.createElement('span');b.className='availability-badge physical';b.textContent='📦 PHYSICAL';badges.append(b);}if(badges.childElementCount)imageWrap.append(badges);imageWrap.addEventListener('click',()=>openGalleryLightbox(p));}const info=document.createElement('div');info.className=isGallery?'gallery-caption':'product-info';const tag=document.createElement('span');tag.className='tag';tag.textContent=p.category||'3D PRINT';const title=document.createElement('h3');title.textContent=p.name||'';const desc=document.createElement('p');desc.textContent=p.description||'';info.append(tag,title,desc);if(isGallery){article.append(imageWrap,info);}else{const a=document.createElement('a');a.href=link;const bottom=document.createElement('div');bottom.className='product-bottom';const label=document.createElement('span');label.textContent='View in gallery';const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';bottom.append(label,arrow);info.append(bottom);a.append(imageWrap,info);article.append(a);}return article;};
  function openGalleryLightbox(p){
   let modal=document.getElementById('galleryLightbox');
   if(!modal){
    modal=document.createElement('div');modal.id='galleryLightbox';modal.className='gallery-lightbox';
    modal.innerHTML='<div class="gallery-lightbox-panel" role="dialog" aria-modal="true" aria-label="Product details"><button class="gallery-lightbox-close" type="button" aria-label="Close photo">×</button><div class="gallery-carousel"><button class="gallery-photo-arrow previous" type="button" aria-label="Previous photo">‹</button><img class="gallery-lightbox-photo" alt=""><button class="gallery-photo-arrow next" type="button" aria-label="Next photo">›</button><span class="gallery-photo-count" aria-live="polite"></span></div><div class="gallery-lightbox-copy"><strong></strong><p></p><div class="gallery-purchase-actions"><span class="digital-price-status" hidden></span><a class="gallery-purchase-link digital" target="_blank" rel="noopener noreferrer">↓ Digital Download</a><a class="gallery-purchase-link physical" target="_blank" rel="noopener noreferrer">📦 Buy Physical Print on Etsy</a></div></div></div>';
    document.body.append(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.gallery-lightbox-close'))modal.classList.remove('open');});
   }
   const photos=[p.image,...(Array.isArray(p.additionalImages)?p.additionalImages:[])].filter((url,i,arr)=>url&&arr.indexOf(url)===i);
   let current=0;
   const photo=modal.querySelector('.gallery-lightbox-photo');
   const prev=modal.querySelector('.gallery-photo-arrow.previous');
   const next=modal.querySelector('.gallery-photo-arrow.next');
   const count=modal.querySelector('.gallery-photo-count');
   const showPhoto=()=>{
    photo.src=photos[current]||p.image||'';photo.alt=(p.name||'Product photo')+(photos.length>1?' — photo '+(current+1):'');
    const multiple=photos.length>1;prev.hidden=!multiple;next.hidden=!multiple;count.hidden=!multiple;count.textContent=(current+1)+' / '+photos.length;
   };
   prev.onclick=()=>{current=(current-1+photos.length)%photos.length;showPhoto();};
   next.onclick=()=>{current=(current+1)%photos.length;showPhoto();};
   modal.onkeydown=e=>{if(e.key==='ArrowLeft'&&photos.length>1){e.preventDefault();prev.click();}if(e.key==='ArrowRight'&&photos.length>1){e.preventDefault();next.click();}if(e.key==='Escape')modal.classList.remove('open');};
   showPhoto();
   modal.querySelector('.gallery-lightbox-copy strong').textContent=p.name||'';
   modal.querySelector('.gallery-lightbox-copy p').textContent=p.description||'';
   const digital=modal.querySelector('.gallery-purchase-link.digital');
   const digitalStatus=modal.querySelector('.digital-price-status');
   const physical=modal.querySelector('.gallery-purchase-link.physical');
   const digitalUrl=p.digitalAvailable?safeProductLink(p.digitalUrl):'';
   const digitalType=p.digitalPriceType||'purchasable';
   digitalStatus.hidden=!digitalUrl;digitalStatus.textContent=digitalType==='free'?'🆓 FREE':'💲 PURCHASABLE';
   digitalStatus.classList.toggle('free',digitalType==='free');digitalStatus.classList.toggle('purchasable',digitalType!=='free');
   const physicalUrl=p.physicalAvailable?safeProductLink(p.etsyUrl):'';
   digital.hidden=!digitalUrl;physical.hidden=!physicalUrl;
   if(digitalUrl)digital.href=digitalUrl;if(physicalUrl)physical.href=physicalUrl;
   modal.querySelector('.gallery-purchase-actions').hidden=!(digitalUrl||physicalUrl);
   modal.classList.add('open');modal.querySelector('.gallery-lightbox-close').focus();
  }
  const gallerySearch=document.getElementById('gallerySearch');
  const gallerySearchClear=document.getElementById('gallerySearchClear');
  const gallerySearchStatus=document.getElementById('gallerySearchStatus');
  let activeCollection="all";
  function filterGalleryByTitle(){
   if(!gallery)return;
   const query=(gallerySearch?.value||'').trim().toLocaleLowerCase();
   let shown=0;
   gallery.querySelectorAll('.gallery-item, .product-card').forEach(card=>{
    const title=card.querySelector('h3')?.textContent||'';
    const matchesCollection=activeCollection==='all'||(card.dataset.collections||'').split(' ').includes(activeCollection);
    const matchesSearch=!query||title.toLocaleLowerCase().includes(query);
    const match=matchesCollection&&matchesSearch;
    card.hidden=!match;card.classList.toggle('search-match',Boolean(query&&match));
    let marker=card.querySelector('.search-match-label');
    if(query&&match){if(!marker){marker=document.createElement('span');marker.className='search-match-label';marker.textContent='SEARCH MATCH';card.querySelector('.gallery-caption,.product-info')?.prepend(marker);}shown++;}
    else if(marker)marker.remove();
   });
   if(gallerySearchStatus){
    const collectionName=document.querySelector('#collectionsGrid [data-collection="'+activeCollection+'"] strong')?.textContent||'';
    gallerySearchStatus.textContent=query?(shown?shown+' '+(shown===1?'matching design':'matching designs')+' found.':'No titles match “'+gallerySearch.value.trim()+'” in this collection. Try another name.'):(activeCollection==='all'?'Search the titles of our gallery pieces.':'Showing '+shown+' '+(shown===1?'design':'designs')+' in '+collectionName+'.');
   }
   let empty=gallery.querySelector('.gallery-search-empty');
   if(!shown&&(query||activeCollection!=='all')){if(!empty){empty=document.createElement('div');empty.className='gallery-search-empty';empty.setAttribute('role','status');gallery.append(empty);}empty.textContent=query?'No matching titles in this collection. Try a different name or view all creations.':'No products have been added to this collection yet.';}
   else if(empty)empty.remove();
   document.querySelectorAll('#collectionsGrid [data-collection],.collection-reset').forEach(button=>{button.classList.toggle('active',button.dataset.collection===activeCollection);button.setAttribute('aria-pressed',button.dataset.collection===activeCollection?'true':'false');});
  }
  if(gallerySearch){
   gallerySearch.addEventListener('input',filterGalleryByTitle);
   gallerySearchClear?.addEventListener('click',()=>{gallerySearch.value='';filterGalleryByTitle();gallerySearch.focus();});
  }
  const gallery=document.getElementById('galleryGrid');
  if(gallery){
   gallery.replaceChildren(...products.map(p=>makeCard(p,'#',true)));
   document.querySelectorAll('#collectionsGrid [data-collection]').forEach(button=>{
    const key=button.dataset.collection,matching=products.filter(p=>getProductCollections(p).includes(key));
    const img=button.querySelector('.collection-image img');
    if(img&&matching[0]?.image){img.src=matching[0].image;img.alt=button.querySelector('strong')?.textContent||'Collection';}
    const count=button.querySelector('[data-count]');if(count)count.textContent=matching.length+' '+(matching.length===1?'design':'designs');
    button.addEventListener('click',()=>{activeCollection=key;if(gallerySearch)gallerySearch.value='';filterGalleryByTitle();gallery.scrollIntoView({behavior:'smooth',block:'start'});});
   });
   document.querySelectorAll('.collection-reset').forEach(button=>button.addEventListener('click',()=>{activeCollection='all';if(gallerySearch)gallerySearch.value='';filterGalleryByTitle();gallery.scrollIntoView({behavior:'smooth',block:'start'});}));
   filterGalleryByTitle();
  }
  const home=document.querySelector('.home-products');
  if(home){const featured=products.filter(p=>p.featured).slice(0,4);if(featured.length)home.replaceChildren(...featured.map(p=>makeCard(p,'gallery.html')));}
  if(content.settings?.etsyUrl){document.querySelectorAll('a[href*="thingamabobprints.etsy.com"]').forEach(a=>a.href=content.settings.etsyUrl);}
 }catch(error){console.warn('Managed site content unavailable; showing built-in content.',error);}
}
loadManagedContent();
