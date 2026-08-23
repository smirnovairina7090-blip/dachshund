(()=>{
  const applyInline=async()=>{
    let raw='';
    try{
      const r=await fetch('motya-idle.b64?v=standalone-1',{cache:'no-store'});
      if(!r.ok)return;
      raw=(await r.text()).replace(/\s+/g,'');
      if(!raw.startsWith('UklG'))return;
    }catch{return}
    const data='data:image/webp;base64,'+raw;
    document.querySelectorAll('.motya-direct-img').forEach(img=>{
      if(!img.complete||!img.naturalWidth){img.onerror=null;img.src=data;}
    });
  };
  setTimeout(applyInline,500);
  setTimeout(applyInline,1600);
  const obs=new MutationObserver(()=>setTimeout(applyInline,100));
  const stage=document.getElementById('stage');
  if(stage)obs.observe(stage,{subtree:true,childList:true});
  setTimeout(()=>obs.disconnect(),12000);
})();
