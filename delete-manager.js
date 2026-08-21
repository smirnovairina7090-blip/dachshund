(()=>{
  const stage=document.getElementById('stage');
  const resetBtn=document.getElementById('reset');
  if(!stage||!resetBtn)return;

  const LONG_PRESS=485;
  const MOVE_SLOP=8;
  const BASE_DELETE_KEY='motya-base-deleted-v1';
  const baseNames={
    garden:'Тумба с растениями',stove:'Камин',armchair:'Кресло',sofa:'Диван',rug:'Джутовый ковёр',table:'Чайный столик',bed:'Лежанка',bookcase:'Книжный шкаф',plant:'Растение'
  };
  const srcNames={
    'armchair.webp':'Кресло','sofa.webp':'Диван','bookcase.webp':'Книжный шкаф','stove.webp':'Камин','table.webp':'Чайный столик','nightstand.webp':'Тумбочка','garden.webp':'Тумба с растениями','rug.webp':'Джутовый ковёр','round_bed.webp':'Круглая лежанка','bed_wicker.webp':'Плетёная лежанка','bed_house.webp':'Домик-лежанка','plant.webp':'Растение','plant_alt1.webp':'Растение','plant_alt2.webp':'Растение'
  };

  let deletedBase=[];
  try{deletedBase=JSON.parse(localStorage.getItem(BASE_DELETE_KEY)||'[]')}catch{deletedBase=[]}
  if(!Array.isArray(deletedBase))deletedBase=[];

  let press=null;
  let selected=null;
  let confirmTarget=null;

  const confirmBackdrop=document.createElement('div');
  confirmBackdrop.className='delete-confirm-backdrop';
  const confirmDialog=document.createElement('section');
  confirmDialog.className='delete-confirm';
  confirmDialog.setAttribute('role','dialog');
  confirmDialog.setAttribute('aria-modal','true');
  confirmDialog.setAttribute('aria-hidden','true');
  confirmDialog.innerHTML=`
    <div class="delete-confirm-icon"><span class="delete-confirm-thumb"></span></div>
    <small>Убрать из комнаты</small>
    <b class="delete-confirm-title">Убрать предмет?</b>
    <p>Уверены, что хотите отказаться от этого предмета мебели?</p>
    <div class="delete-confirm-actions">
      <button type="button" class="delete-cancel">Оставить</button>
      <button type="button" class="delete-accept">Убрать</button>
    </div>`;
  stage.append(confirmBackdrop,confirmDialog);
  const thumb=confirmDialog.querySelector('.delete-confirm-thumb');
  const title=confirmDialog.querySelector('.delete-confirm-title');
  const cancelBtn=confirmDialog.querySelector('.delete-cancel');
  const acceptBtn=confirmDialog.querySelector('.delete-accept');

  function vibrate(n){try{navigator.vibrate?.(n)}catch{}}
  function itemName(el){
    if(el.dataset.id&&baseNames[el.dataset.id])return baseNames[el.dataset.id];
    const src=el.querySelector('img')?.getAttribute('src')||'';
    const key=Object.keys(srcNames).find(k=>src.endsWith(k));
    return key?srcNames[key]:'Предмет мебели';
  }
  function itemImage(el){return el.querySelector('img')?.getAttribute('src')||''}
  function saveDeletedBase(){localStorage.setItem(BASE_DELETE_KEY,JSON.stringify(deletedBase))}

  function clearSelection(){
    if(!selected)return;
    selected.el.classList.remove('global-delete-selected');
    selected.el.querySelector('.global-delete-chip')?.remove();
    selected=null;
  }

  function selectItem(el){
    clearSelection();
    if(!el?.isConnected)return;
    const chip=document.createElement('button');
    chip.type='button';chip.className='global-delete-chip';chip.setAttribute('aria-label','Удалить предмет');chip.textContent='×';
    chip.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
    chip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openConfirm(el)});
    el.appendChild(chip);
    el.classList.add('global-delete-selected');
    selected={el,chip};
    vibrate(10);
  }

  function openConfirm(el){
    if(!el?.isConnected)return;
    confirmTarget=el;
    const name=itemName(el),src=itemImage(el);
    title.textContent=name;
    thumb.replaceChildren();
    if(src){const img=document.createElement('img');img.src=src;img.alt='';thumb.appendChild(img)}
    confirmBackdrop.classList.add('open');confirmDialog.classList.add('open');confirmDialog.setAttribute('aria-hidden','false');
    stage.classList.add('delete-confirm-open');
    vibrate(5);
  }

  function closeConfirm(clear=true){
    confirmBackdrop.classList.remove('open');confirmDialog.classList.remove('open');confirmDialog.setAttribute('aria-hidden','true');stage.classList.remove('delete-confirm-open');confirmTarget=null;
    if(clear)clearSelection();
  }

  function removeBase(el){
    const id=el.dataset.id;
    if(id&&!deletedBase.includes(id)){deletedBase.push(id);saveDeletedBase()}
    const a=el.animate?.([{opacity:1,filter:'brightness(1)'},{opacity:.15,filter:'brightness(1.08)',offset:.55},{opacity:0,filter:'blur(2px)'}],{duration:230,easing:'ease-in'});
    if(a)a.finished.then(()=>el.remove()).catch(()=>el.remove());else el.remove();
  }

  function confirmDelete(){
    const el=confirmTarget;
    if(!el)return closeConfirm();
    confirmTarget=null;
    confirmBackdrop.classList.remove('open');confirmDialog.classList.remove('open');confirmDialog.setAttribute('aria-hidden','true');stage.classList.remove('delete-confirm-open');
    vibrate(12);
    if(el.classList.contains('shop-added')){
      const internalDelete=el.querySelector('.shop-delete');
      clearSelection();
      if(internalDelete)internalDelete.click();else el.remove();
    }else{
      clearSelection();removeBase(el);
    }
  }

  cancelBtn.addEventListener('click',()=>closeConfirm(true));
  acceptBtn.addEventListener('click',confirmDelete);
  confirmBackdrop.addEventListener('click',()=>closeConfirm(true));
  confirmDialog.addEventListener('pointerdown',e=>e.stopPropagation());

  function cancelPress(){if(!press)return;clearTimeout(press.timer);press=null}
  function cancelNativeLongPress(pointerId,x,y){
    try{
      const ev=new PointerEvent('pointercancel',{bubbles:true,cancelable:true,pointerId,clientX:x,clientY:y});
      ev.__motyaDeleteSynthetic=true;
      stage.dispatchEvent(ev);
    }catch{}
    document.getElementById('variantClose')?.click();
  }

  stage.addEventListener('pointerdown',e=>{
    if(e.__motyaDeleteSynthetic)return;
    if(confirmDialog.classList.contains('open'))return;
    if(e.target.closest?.('.global-delete-chip'))return;
    if(e.target.closest?.('button,.dock,.variant-panel,.shop-panel,.shop-backdrop')){cancelPress();clearSelection();return}
    if(!stage.classList.contains('arrange-mode')){cancelPress();clearSelection();return}
    const el=e.target.closest?.('.item');
    if(!el){cancelPress();clearSelection();return}
    if(selected?.el!==el)clearSelection();
    cancelPress();
    const p={id:e.pointerId,el,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,timer:0};
    p.timer=setTimeout(()=>{
      if(press!==p||!el.isConnected)return;
      cancelNativeLongPress(p.id,p.x,p.y);
      press=null;
      selectItem(el);
    },LONG_PRESS);
    press=p;
  },true);

  stage.addEventListener('pointermove',e=>{
    if(!press||press.id!==e.pointerId)return;
    press.x=e.clientX;press.y=e.clientY;
    if(Math.hypot(e.clientX-press.sx,e.clientY-press.sy)>=MOVE_SLOP){cancelPress();clearSelection()}
  },true);
  stage.addEventListener('pointerup',e=>{if(press?.id===e.pointerId)cancelPress()},true);
  stage.addEventListener('pointercancel',e=>{if(e.__motyaDeleteSynthetic)return;if(press?.id===e.pointerId)cancelPress()},true);
  stage.addEventListener('contextmenu',e=>{if(e.target.closest?.('.item'))e.preventDefault()});

  deletedBase.forEach(id=>objectsQuery(id)?.remove());
  function objectsQuery(id){return stage.querySelector(`.item[data-id="${id}"]`)}

  resetBtn.addEventListener('click',()=>{
    deletedBase=[];localStorage.removeItem(BASE_DELETE_KEY);clearSelection();closeConfirm(false);
    setTimeout(()=>location.reload(),80);
  });
})();
