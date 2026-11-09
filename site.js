
// SITE SETTINGS — replace these values before publishing.
const SITE_SETTINGS = {
  etsyUrl: "",          // Example: https://www.etsy.com/shop/YourShopName
  instagramUrl: "",     // Example: https://www.instagram.com/yourhandle/
  businessEmail: "hello@example.com"
};
document.querySelectorAll('[data-link="etsy"]').forEach(a=>{
  a.href=SITE_SETTINGS.etsyUrl || "#";
  a.addEventListener('click',e=>{if(!SITE_SETTINGS.etsyUrl){e.preventDefault();alert("Add your Etsy shop URL in assets/site.js to activate this link.");}});
});
document.querySelectorAll('[data-link="instagram"]').forEach(a=>{
  a.href=SITE_SETTINGS.instagramUrl || "#";
  a.addEventListener('click',e=>{if(!SITE_SETTINGS.instagramUrl){e.preventDefault();alert("Add your Instagram URL in assets/site.js to activate this link.");}});
});
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
const filters=document.getElementById('filters');
if(filters){filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filters.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));b.classList.add('active');const f=b.dataset.filter;document.querySelectorAll('#galleryGrid .product-card').forEach(c=>c.style.display=(f==='all'||c.dataset.category===f)?'':'none');});}
function mailForm(id,subjectField,bodyField){
 const form=document.getElementById(id); if(!form)return;
 form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);const subject=subjectField(d);const body=bodyField(d);if(!SITE_SETTINGS.businessEmail||SITE_SETTINGS.businessEmail==='hello@example.com'){alert('Please set your business email in assets/site.js before using this form.');return;}window.location.href='mailto:'+SITE_SETTINGS.businessEmail+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);});
}
mailForm('customForm',d=>'Custom 3D print request',d=>`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nTiming: ${d.get('timing')}\n\nProject details:\n${d.get('details')}`);
mailForm('contactForm',d=>d.get('subject')||'Website inquiry',d=>`Name: ${d.get('name')}\nEmail: ${d.get('email')}\n\n${d.get('message')}`);
