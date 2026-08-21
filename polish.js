(()=>{
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  const floorGuide=document.getElementById('floorGuide');
  if(!stage||!scene)return;

  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Extra living-light layer. It is visual only and sits below furniture.
  if(!scene.querySelector('.polish-light')){
    const light=document.createElement('div');
    light.className='polish-light';
    if(floorGuide)scene.insertBefore(light,floorGuide);else scene.appendChild(light);
  }

  // Sliding indicator for the two shop categories + one-time "new" dot.
  const tabsWrap=stage.querySelector('.shop-tabs');
  const shopTabs=[...stage.querySelectorAll('.shop-tab')];
  let indicator=null;
  if(tabsWrap&&shopTabs.length){
    indicator=document.createElement('span');
    indicator.className='shop-tab-indicator';
    indicator.setAttribute('aria-hidden','true');
    tabsWrap.prepend(indicator);

    const plantsTab=shopTabs.find(t=>t.dataset.category==='plants');
    const PLANTS_SEEN='motya-shop-plants-polish-seen-v1';
    if(plantsTab&&!localStorage.getItem(PLANTS_SEEN))plantsTab.classList.add('has-new');

    const syncIndicator=()=>{
      const active=shopTabs.find(t=>t.classList.contains('active'))||shopTabs[0];
      indicator.style.transform=active?.dataset.category==='plants'?'translateX(calc(100% + 6px))':'translateX(0)';
    };
    syncIndicator();

    shopTabs.forEach(tab=>tab.addEventListener('click',()=>{
      if(tab.dataset.category==='plants'){
        tab.classList.remove('has-new');
        try{localStorage.setItem(PLANTS_SEEN,'1')}catch{}
      }
      requestAnimationFrame(syncIndicator);
    }));
    document.getElementById('shopBtn')?.addEventListener('click',()=>requestAnimationFrame(syncIndicator));
  }

  // Gentle selection feedback in arrange mode. Drag/delete states still take priority in CSS.
  let selected=null;
  function clearSelected(){
    selected?.classList.remove('polish-selected');
    selected=null;
  }
  function select(el){
    if(selected===el)return;
    clearSelected();
    if(el?.isConnected){selected=el;selected.classList.add('polish-selected')}
  }
  stage.addEventListener('pointerdown',e=>{
    if(!stage.classList.contains('arrange-mode'))return clearSelected();
    if(e.target.closest?.('button,.dock,.shop-panel,.shop-backdrop,.variant-panel,.delete-confirm,.delete-confirm-backdrop'))return;
    const item=e.target.closest?.('.item');
    if(item)select(item);else clearSelected();
  });
  document.getElementById('viewMode')?.addEventListener('click',clearSelected);
  document.getElementById('shopBtn')?.addEventListener('click',clearSelected);

  // Card -> room purchase flight. The real object is still created by shop.js.
  function flyPurchase(card){
    if(reduceMotion)return;
    const img=card.querySelector('img');
    if(!img)return;
    const r=img.getBoundingClientRect();
    const sr=stage.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    const ghost=img.cloneNode(true);
    ghost.className='purchase-ghost';
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    document.body.appendChild(ghost);
    const sx=r.left+r.width/2,sy=r.top+r.height/2;
    const tx=sr.left+sr.width/2,ty=sr.top+sr.height*.69;
    const dx=tx-sx,dy=ty-sy;
    const a=ghost.animate([
      {transform:'translate3d(0,0,0) scale(1)',opacity:.98,filter:'drop-shadow(0 9px 8px rgba(55,31,16,.20))'},
      {transform:`translate3d(${dx*.56}px,${dy*.48}px,0) scale(.72)`,opacity:1,offset:.56},
      {transform:`translate3d(${dx}px,${dy}px,0) scale(.38)`,opacity:0,filter:'drop-shadow(0 3px 4px rgba(55,31,16,.08)) blur(1px) brightness(1.1)'}
    ],{duration:430,easing:'cubic-bezier(.2,.78,.22,1)'});
    a.finished.then(()=>ghost.remove()).catch(()=>ghost.remove());
  }
  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.shop-card');
    if(!card)return;
    card.classList.add('purchasing');
    flyPurchase(card);
    setTimeout(()=>card.classList.remove('purchasing'),220);
  },true);

  // Variant changes already crossfade in app.js; this adds a soft spatial halo around the item.
  function morphHalo(item){
    if(reduceMotion||!item)return;
    const r=item.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    const halo=document.createElement('div');
    halo.className='morph-halo';
    Object.assign(halo.style,{left:(r.left-6)+'px',top:(r.top-6)+'px',width:(r.width+12)+'px',height:(r.height+12)+'px'});
    document.body.appendChild(halo);
    const a=halo.animate([
      {opacity:0,transform:'scale(.94)'},
      {opacity:.8,transform:'scale(1.015)',offset:.42},
      {opacity:0,transform:'scale(1.075)'}
    ],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
    a.finished.then(()=>halo.remove()).catch(()=>halo.remove());
  }
  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.variant-option'))return;
    morphHalo(stage.querySelector('.picker-target'));
  },true);

  // A visual dissolve ghost runs alongside the existing persistence/delete flow.
  function dissolveSelected(){
    if(reduceMotion)return;
    const item=stage.querySelector('.global-delete-selected');
    const img=item?.querySelector('img');
    if(!item||!img)return;
    const r=img.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    const ghost=img.cloneNode(true);
    ghost.className='delete-ghost';
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    document.body.appendChild(ghost);
    const a=ghost.animate([
      {opacity:.96,transform:'translate3d(0,0,0) scale(1)',filter:'blur(0) brightness(1)'},
      {opacity:.54,transform:'translate3d(0,-3px,0) scale(.94)',filter:'blur(.6px) brightness(1.06)',offset:.5},
      {opacity:0,transform:'translate3d(0,-8px,0) scale(.78)',filter:'blur(5px) brightness(1.12)'}
    ],{duration:390,easing:'cubic-bezier(.3,.02,.3,1)'});
    a.finished.then(()=>ghost.remove()).catch(()=>ghost.remove());

    const cx=r.left+r.width/2,cy=r.top+r.height*.58;
    for(let i=0;i<6;i++){
      const p=document.createElement('i');
      p.className='delete-spark';
      p.style.left=(cx-2)+'px';p.style.top=(cy-2)+'px';document.body.appendChild(p);
      const angle=(-Math.PI*.9)+(i/5)*Math.PI*.8;
      const dist=18+Math.random()*24;
      const dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist-8-Math.random()*8;
      const pa=p.animate([
        {opacity:0,transform:'translate3d(0,0,0) scale(.5)'},
        {opacity:.8,transform:`translate3d(${dx*.35}px,${dy*.35}px,0) scale(1)`,offset:.35},
        {opacity:0,transform:`translate3d(${dx}px,${dy}px,0) scale(.2)`}
      ],{duration:330+Math.random()*110,easing:'ease-out'});
      pa.finished.then(()=>p.remove()).catch(()=>p.remove());
    }
  }
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.delete-accept'))dissolveSelected();
  },true);

  // Keep stale selection classes from surviving DOM deletion or mode changes.
  const observer=new MutationObserver(()=>{if(selected&&!selected.isConnected)selected=null});
  observer.observe(stage,{childList:true,subtree:true});
})();
