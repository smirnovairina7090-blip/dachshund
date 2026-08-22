(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const apply=dataUrl=>{
    const cssUrl=`url("${dataUrl}")`;
    stage.style.setProperty('--motya-sheet',cssUrl,'important');
    document.documentElement.style.setProperty('--motya-sheet',cssUrl,'important');
    document.querySelectorAll('.motya-sprite').forEach(el=>{
      el.style.setProperty('background-image',cssUrl,'important');
    });
  };

  const watch=dataUrl=>{
    apply(dataUrl);
    const observer=new MutationObserver(()=>apply(dataUrl));
    observer.observe(stage,{subtree:true,childList:true});
    let n=0;
    const timer=setInterval(()=>{
      apply(dataUrl);
      if(++n>=20){clearInterval(timer);observer.disconnect()}
    },250);
  };

  fetch('motya-sheet.b64?v=3',{cache:'no-store'})
    .then(r=>{
      if(!r.ok)throw new Error(`Motya sheet ${r.status}`);
      return r.text();
    })
    .then(raw=>{
      const b64=raw.replace(/\s+/g,'');
      if(!b64.startsWith('UklG'))throw new Error('Invalid Motya WebP payload');
      const dataUrl=`data:image/webp;base64,${b64}`;
      const probe=new Image();
      probe.onload=()=>watch(dataUrl);
      probe.onerror=()=>watch(dataUrl);
      probe.src=dataUrl;
    })
    .catch(err=>console.error('Motya image loader:',err));
})();
