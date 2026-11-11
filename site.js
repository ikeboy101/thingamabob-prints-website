
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
