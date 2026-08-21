(()=>{
  const COINS_KEY='motya-coins-v1';
  const MIGRATION_KEY='motya-coins-start-200-v1';
  const START_COINS=200;
  try{
    const raw=localStorage.getItem(COINS_KEY);
    const migrated=localStorage.getItem(MIGRATION_KEY)==='1';
    if(raw===null){
      localStorage.setItem(COINS_KEY,String(START_COINS));
      localStorage.setItem(MIGRATION_KEY,'1');
      return;
    }
    const current=Number(raw);
    if(!migrated){
      if(!Number.isFinite(current)||current<START_COINS){
        localStorage.setItem(COINS_KEY,String(START_COINS));
      }
      localStorage.setItem(MIGRATION_KEY,'1');
    }
  }catch{}
})();
