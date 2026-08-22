(async()=>{
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  if(!stage||!scene)return;

  const FRAMES={
    idle:[0,0],sit:[1,0],sleep:[2,0],sad:[0,1],play:[1,1],
    walk1:[2,1],walk2:[0,2],walk3:[1,2],walk4:[2,2]
  };
  const WALK=['walk1','walk2','walk3','walk4'];

  try{
    const raw=(await fetch('motya-sheet.b64',{cache:'force-cache'})).text();
    const b64=(await raw).trim();
    const binary=atob(b64),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
    stage.style.setProperty('--motya-sheet',`url("${url}")`);
  }catch(err){console.warn('Motya sprite sheet did not load',err)}

  const HOME={x:1120,y:748,w:230};
  const state={x:HOME.x,y:HOME.y,w:HOME.w,pose:'idle',busy:false,sleeping:false,sleepTimer:0,walkTimer:0};

  function spriteMarkup(extra=''){return `<span class="motya-sprite ${extra}" aria-hidden="true"></span>`}
  function setSprite(el,name){
    const [c,r]=FRAMES[name]||FRAMES.idle;
    el.style.setProperty('--motya-x',(c*50)+'%');
    el.style.setProperty('--motya-y',(r*50)+'%');
  }

  const character=document.createElement('button');
  character.id='motyaCharacter';character.className='motya-character';character.type='button';character.setAttribute('aria-label','Мотя');
  character.innerHTML=spriteMarkup();
  const sprite=character.querySelector('.motya-sprite');scene.appendChild(character);

  function setPosition(x,y,w=state.w){
    state.x=x;state.y=y;state.w=w;
    character.style.left=x+'px';character.style.top=y+'px';character.style.width=w+'px';character.style.zIndex=String(920+Math.round(y));
  }
  function setPose(pose){state.pose=pose;character.dataset.pose=pose;setSprite(sprite,pose)}
  setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);

  const actions=document.createElement('div');
  actions.className='motya-actions';actions.setAttribute('aria-hidden','true');
  actions.innerHTML=`<div class="motya-actions-title"><span class="motya-paw">✦</span><b>Чем займёмся?</b></div><div class="motya-actions-row"><button type="button" data-action="sleep"><span>☾</span><b>Отдохнуть</b></button><button type="button" data-action="play"><span>♡</span><b>Поиграть</b></button><button type="button" data-action="mood"><span>☺</span><b>Как ты?</b></button></div>`;
  stage.appendChild(actions);

  const toast=document.createElement('div');toast.className='motya-toast';toast.setAttribute('aria-live','polite');stage.appendChild(toast);
  let toastTimer=0;
  function say(text,ms=2200){clearTimeout(toastTimer);toast.textContent=text;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),ms)}
  function openActions(){if(state.busy||state.sleeping||stage.classList.contains('arrange-mode'))return;actions.classList.add('open');actions.setAttribute('aria-hidden','false')}
  function closeActions(){actions.classList.remove('open');actions.setAttribute('aria-hidden','true')}

  function restSpot(){
    const chair=document.querySelector('#objects .item[data-id="armchair"]');
    const bed=document.querySelector('#objects .item[data-id="bed"]');
    const usable=el=>el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&Number(getComputedStyle(el).opacity)>0.05;
    if(usable(chair))return{kind:'chair',x:parseFloat(chair.style.left)||760,walkY:718,sleepY:648,sleepW:158};
    if(usable(bed))return{kind:'bed',x:parseFloat(bed.style.left)||1515,walkY:720,sleepY:690,sleepW:168};
    return{kind:'floor',x:930,walkY:730,sleepY:724,sleepW:175};
  }

  function walkTo(x,y,duration=1750){
    return new Promise(resolve=>{
      clearInterval(state.walkTimer);
      const sx=state.x,sy=state.y,start=performance.now(),left=x<sx;
      character.classList.add('walking');character.classList.toggle('facing-left',left);setPose('walk1');
      let frame=0;state.walkTimer=setInterval(()=>{frame=(frame+1)%WALK.length;setSprite(sprite,WALK[frame])},125);
      const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      function step(now){
        const t=Math.min(1,(now-start)/duration),q=ease(t);setPosition(sx+(x-sx)*q,sy+(y-sy)*q,225);
        if(t<1)requestAnimationFrame(step);else{clearInterval(state.walkTimer);state.walkTimer=0;character.classList.remove('walking','facing-left');resolve()}
      }
      requestAnimationFrame(step);
    });
  }

  async function goSleep(){
    if(state.busy)return;state.busy=true;closeActions();const spot=restSpot();say('Мотя идёт отдыхать…',1700);
    await walkTo(spot.x,spot.walkY,1900);character.classList.add('pose-swap');await new Promise(r=>setTimeout(r,140));
    setPose('sleep');setPosition(spot.x,spot.sleepY,spot.sleepW);character.classList.remove('pose-swap');character.classList.add('sleeping');state.sleeping=true;state.busy=false;
    say('Тсс… Мотя уснула. Нажми на неё, если захочешь разбудить.',3200);state.sleepTimer=setTimeout(()=>wakeUp(true),8500);
  }

  async function wakeUp(auto=false){
    if(!state.sleeping||state.busy)return;clearTimeout(state.sleepTimer);state.sleepTimer=0;state.sleeping=false;state.busy=true;character.classList.remove('sleeping');
    const spot=restSpot();setPose('play');setPosition(spot.x,spot.walkY,210);say(auto?'Мотя проснулась и сладко потянулась!':'Доброе утро, Мотя!',1700);
    await new Promise(r=>setTimeout(r,1250));await walkTo(HOME.x,HOME.y,1900);setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);state.busy=false;
  }

  function play(){
    if(state.busy||state.sleeping)return;state.busy=true;closeActions();setPose('play');setPosition(state.x,state.y,235);character.classList.add('happy-bounce');say('Ура! Немного поиграем ♡',2100);
    setTimeout(()=>{character.classList.remove('happy-bounce');setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);state.busy=false},2300);
  }
  function mood(){
    if(state.busy||state.sleeping)return;state.busy=true;closeActions();setPose('sad');setPosition(state.x,state.y,205);character.classList.add('sad-mode');say('Я чуть-чуть скучаю. Погладишь меня?',2800);
    setTimeout(()=>{character.classList.remove('sad-mode');setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);state.busy=false},3200);
  }

  actions.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;if(btn.dataset.action==='sleep')goSleep();if(btn.dataset.action==='play')play();if(btn.dataset.action==='mood')mood()});
  character.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(state.sleeping){wakeUp(false);return}if(state.busy)return;actions.classList.contains('open')?closeActions():openActions()});
  document.getElementById('arrange')?.addEventListener('click',closeActions);

  const intro=document.createElement('section');intro.className='motya-intro';intro.setAttribute('aria-label','Знакомство с Мотей');
  intro.innerHTML=`<div class="motya-intro-card"><button class="motya-intro-close" type="button" aria-label="Закрыть знакомство">×</button><div class="motya-intro-dog">${spriteMarkup()}</div><div class="motya-intro-copy"><span class="motya-kicker">Твой цифровой питомец</span><div class="motya-type" aria-live="polite"></div><span class="motya-caret" aria-hidden="true"></span></div><div class="motya-intro-actions"><button type="button" data-intro="breed" class="secondary">Узнать о таксах</button><button type="button" data-intro="care" class="primary">Позаботиться о Моте</button></div><div class="motya-breed" hidden><b>Три вещи о таксах</b><p><span>01</span> Таксы были выведены для норной охоты, поэтому они обожают нюхать, искать и копать.</p><p><span>02</span> Их длинную спину лучше беречь от лишних прыжков и поддерживать хорошую физическую форму.</p><p><span>03</span> Таксам нужны не только прогулки, но и задачи для головы: поиск лакомств, новые команды и игры.</p><button type="button" data-intro="back">Вернуться к Моте</button></div></div>`;
  stage.appendChild(intro);stage.classList.add('motya-intro-open');setSprite(intro.querySelector('.motya-sprite'),'idle');
  const typeEl=intro.querySelector('.motya-type'),caret=intro.querySelector('.motya-caret'),introActions=intro.querySelector('.motya-intro-actions'),breed=intro.querySelector('.motya-breed'),copy=intro.querySelector('.motya-intro-copy'),introDog=intro.querySelector('.motya-intro-dog');
  const message='Привет! Я Мотя. Я твой цифровой питомец и помогу тебе ухаживать за твоей таксой.';let typingTimer=0,typed=0;
  function typeNext(){if(typed>=message.length){caret.classList.add('done');introActions.classList.add('ready');return}typeEl.textContent+=message[typed++];typingTimer=setTimeout(typeNext,26)}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){typeEl.textContent=message;introActions.classList.add('ready');caret.classList.add('done')}else setTimeout(typeNext,420);
  function closeIntro(openCare=false){clearTimeout(typingTimer);intro.classList.add('closing');stage.classList.remove('motya-intro-open');setTimeout(()=>intro.remove(),360);if(openCare)setTimeout(()=>{say('Нажимай на Мотю в комнате - выберем занятие.',2500);openActions()},480)}
  intro.addEventListener('click',e=>{if(e.target.closest('.motya-intro-close')){closeIntro(false);return}const btn=e.target.closest('[data-intro]');if(!btn)return;if(btn.dataset.intro==='care'){closeIntro(true);return}if(btn.dataset.intro==='breed'){copy.hidden=true;introActions.hidden=true;introDog.classList.add('small');breed.hidden=false;return}if(btn.dataset.intro==='back'){breed.hidden=true;copy.hidden=false;introActions.hidden=false;introDog.classList.remove('small')}});
  window.motyaGame={openActions,goSleep,wakeUp,setPose};
})();
