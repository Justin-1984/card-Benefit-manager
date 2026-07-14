
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}

function switchTab(tab){
  document.body.setAttribute('data-tab',tab);
  const d=document.getElementById('tabDashboard'), sub=document.getElementById('tabSubscriptions'), st=document.getElementById('tabSettings');
  if(d)d.classList.toggle('active',tab==='dashboard');
  if(sub)sub.classList.toggle('active',tab==='subscriptions');
  if(st)st.classList.toggle('active',tab==='settings');
  localStorage.setItem('benefit-manager-active-tab',tab);
  if(tab==='subscriptions')renderSubscriptions();
}

const STORE='benefit-manager-v6.2', MONTH='benefit-manager-period-key-v6.2';
const GHCFG='benefit-manager-github-config-v6.2';
const APP_VERSION='7.4.4', APP_BUILD=744, DATA_VERSION='1.0', PRE_UPDATE_BACKUP='benefit-manager-pre-update-backup-v6.6', AUTO_BACKUPS='benefit-manager-auto-backups-v6.6';
const COLORS=['#e11d48','#0ea5e9','#a855f7','#f97316','#22c55e','#334155','#111827','#2563eb'];
const defaultGroups=['현대','생활','자동결제','교통','기타'];

const SUB_STORE='benefit-manager-subscriptions-v7.2.1';
let subscriptionCalendarOffset=0;
let subscriptionCalendarSelectedKey='';
let subscriptionListCollapsed=false;
function loadSubscriptions(){try{const r=localStorage.getItem(SUB_STORE);if(r){const arr=JSON.parse(r);return Array.isArray(arr)?arr:[]}}catch(e){}return[]}
function saveSubscriptions(list){localStorage.setItem(SUB_STORE,JSON.stringify(list||[]))}
function normalizeSubscription(s){
  const base={active:true,currency:'KRW',cycle:'monthly',autoApply:false,appliedMonths:{},category:'구독',applyLog:[]};
  const out={...base,...(s||{})};
  out.appliedMonths=out.appliedMonths&&typeof out.appliedMonths==='object'?out.appliedMonths:{};
  out.applyLog=Array.isArray(out.applyLog)?out.applyLog:[];
  Object.keys(out.appliedMonths).forEach(k=>{
    if(typeof out.appliedMonths[k]!=='object')out.appliedMonths[k]={appliedAt:out.appliedMonths[k],legacy:true};
  });
  return out;
}
function getSubscriptions(){return loadSubscriptions().map(normalizeSubscription)}
function subMonthKey(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')}
function subscriptionApplied(s,key){const ap=(s.appliedMonths||{})[key];return !!ap}
function addSubscriptionApplyLog(s,entry){s.applyLog=Array.isArray(s.applyLog)?s.applyLog:[];s.applyLog.unshift(entry);s.applyLog=s.applyLog.slice(0,36)}
function subAmountWon(s){let a=Number(s.amount||0);let cur=s.currency||'KRW';if(cur==='USD')a*=Number(s.rate||1380);if(cur==='HKD')a*=Number(s.rate||195);if(cur==='AUD')a*=Number(s.rate||1080);return Math.round(a)}
function nextSubDate(s){const now=new Date(), day=Math.min(28,Math.max(1,Number(s.day||1)));let d=new Date(now.getFullYear(),now.getMonth(),day);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d=new Date(now.getFullYear(),now.getMonth()+1,day);return d}
function subDday(s){const today=new Date();const base=new Date(today.getFullYear(),today.getMonth(),today.getDate());return Math.ceil((nextSubDate(s)-base)/86400000)}
function subCardName(id){const c=(data.cards||[]).find(x=>x.id===id);return c?c.name:'카드 미지정'}
function subCurrencyLabel(s){return (s.currency||'KRW')==='KRW'?fmt(s.amount):`${Number(s.amount||0).toLocaleString()} ${s.currency}<span class="currency-chip">≈ ${fmt(subAmountWon(s))}</span>`}
function subscriptionStats(){const list=getSubscriptions().filter(s=>s.active!==false);let total=list.reduce((a,s)=>a+subAmountWon(s),0);let soon=list.filter(s=>subDday(s)<=7);let soonAmt=soon.reduce((a,s)=>a+subAmountWon(s),0);let auto=list.filter(s=>s.autoApply&&s.cardId);let next=[...list].sort((a,b)=>subDday(a)-subDday(b))[0];let key=subMonthKey();let unapplied=list.filter(s=>s.autoApply&&s.cardId&&!subscriptionApplied(s,key));return{list,total,soon,soonAmt,auto,next,unapplied}}
function cardSubscriptionProjection(cardId){return getSubscriptions().filter(s=>s.active!==false&&s.autoApply&&s.cardId===cardId).reduce((a,s)=>a+subAmountWon(s),0)}
function cardRemainForRecommendation(c){return Math.max(0,Number(c.target||0)-Number(c.spent||0)-cardSubscriptionProjection(c.id))}
function recommendCardForSubscription(s){
  const amt=subAmountWon(s);
  const cards=(data.cards||[]).filter(c=>!c.hidden&&Number(c.target||0)>0);
  if(!cards.length)return null;
  const ranked=cards.map(c=>{const remain=cardRemainForRecommendation(c);const after=Math.max(0,remain-amt);let score=0;
    if(remain===0)score=10;
    else if(amt>=remain)score=100000-remain;
    else score=50000-after;
    if(c.id===s.cardId)score+=1200;
    if(/정기|자동|구독/i.test((c.group||'')+' '+(c.memo||'')))score+=500;
    return{card:c,remain,after,score};
  }).sort((a,b)=>b.score-a.score);
  return ranked[0]||null;
}
function renderSubscriptionRecommendations(){
  const box=document.getElementById('subscriptionRecommendations');if(!box)return;
  const list=getSubscriptions().filter(s=>s.active!==false).sort((a,b)=>subDday(a)-subDday(b));
  if(!list.length){box.innerHTML='<div class="subscription-empty">구독을 추가하면 카드 추천이 표시됩니다.</div>';return}
  const rows=list.map(s=>{const rec=recommendCardForSubscription(s),amt=subAmountWon(s);if(!rec)return null;const current=s.cardId===rec.card.id;if(current)return null;const currentName=subCardName(s.cardId);const willComplete=rec.remain>0&&amt>=rec.remain;const status=willComplete?'이 카드로 실적 달성 가능':'이 카드가 더 유리함';const badge=willComplete?'good':'';return `<div class="rec-item"><div class="rec-top"><div><div class="rec-name">${s.name||'구독'} · ${fmt(amt)}</div><div class="rec-meta">현재 카드: <b>${currentName}</b><br>추천 카드: <b>${rec.card.name}</b><br>반영 전 남은 실적 ${fmt(rec.remain)} → 반영 후 ${rec.after>0?fmt(rec.after):'달성'}</div></div><span class="rec-badge ${badge}">${status}</span></div><button class="btn blue" style="width:100%;margin-top:8px" onclick="setSubscriptionCardFromRecommendation('${s.id}','${rec.card.id}')">추천 카드로 변경</button></div>`}).filter(Boolean);
  box.innerHTML=rows.length?rows.join(''):'<div class="subscription-empty">현재 카드 변경이 필요한 구독이 없습니다.</div>';
}

function setSubscriptionCardFromRecommendation(subscriptionId,cardId){
  let list=getSubscriptions();
  let s=list.find(x=>x.id===subscriptionId);
  let c=(data.cards||[]).find(x=>x.id===cardId);
  if(!s||!c){toast('추천 카드 변경에 실패했습니다');return;}
  if(subscriptionApplied(s,subMonthKey())){
    alert('이번 달 이미 실적 반영된 구독입니다. 중복/혼선을 막기 위해 다음 달부터 카드 변경을 권장합니다.\n그래도 변경은 저장되지만, 이번 달 반영 내역은 기존 기록으로 남습니다.');
  }
  s.cardId=c.id;
  s.autoApply=true;
  s.recommendedCardAppliedAt=Date.now();
  saveSubscriptions(list);
  renderSubscriptions();
  render();
  toast(`${s.name||'구독'} 연결 카드를 ${c.name}(으)로 변경했습니다`);
}

function renderSubscriptionAnalysis(){
  const box=document.getElementById('subscriptionAnalysis');if(!box)return;
  const list=getSubscriptions().filter(s=>s.active!==false);if(!list.length){box.innerHTML='<div class="subscription-empty">분석할 구독 데이터가 없습니다.</div>';return}
  const total=list.reduce((a,s)=>a+subAmountWon(s),0);
  const avg=list.length?Math.round(total/list.length):0;
  const activeCards=new Set(list.map(s=>subCardName(s.cardId))).size;
  const cat={}, card={};
  list.forEach(s=>{const amt=subAmountWon(s);cat[s.category||'구독']=(cat[s.category||'구독']||0)+amt;card[subCardName(s.cardId)]=(card[subCardName(s.cardId)]||0)+amt;});
  const topCard=Object.entries(card).sort((a,b)=>b[1]-a[1])[0]||['없음',0];
  const renderRows=(obj)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,val])=>{const pct=total?Math.round(val/total*1000)/10:0;return `<div class="analysis-row-clean"><div><div class="analysis-row-name">${name}</div><div class="analysis-row-sub">월 ${fmt(val)} · ${pct}%</div><div class="analysis-mini-bar"><div class="analysis-mini-fill" style="width:${Math.max(4,Math.min(100,pct))}%"></div></div></div><div class="analysis-row-value">${fmt(val)}<span class="analysis-row-pct">연 ${fmt(val*12)}</span></div></div>`}).join('');
  box.innerHTML=`<div class="analysis-clean"><div class="analysis-summary-row"><div class="analysis-summary-card"><div class="analysis-summary-label">월 총액</div><div class="analysis-summary-value">${fmt(total)}</div><div class="analysis-summary-sub">활성 구독 ${list.length}건</div></div><div class="analysis-summary-card"><div class="analysis-summary-label">연간 환산</div><div class="analysis-summary-value">${fmt(total*12)}</div><div class="analysis-summary-sub">월 총액 × 12</div></div><div class="analysis-summary-card"><div class="analysis-summary-label">구독당 평균</div><div class="analysis-summary-value">${fmt(avg)}</div><div class="analysis-summary-sub">월 평균 결제 금액</div></div><div class="analysis-summary-card"><div class="analysis-summary-label">최대 부담 카드</div><div class="analysis-summary-value">${fmt(topCard[1])}</div><div class="analysis-summary-sub">${topCard[0]} · 카드 ${activeCards}장 사용</div></div></div><div class="analysis-columns"><div class="analysis-card-clean"><div class="analysis-card-title">카테고리별 비중</div>${renderRows(cat)}</div><div class="analysis-card-clean"><div class="analysis-card-title">카드별 구독 부담액</div>${renderRows(card)}</div></div></div>`;
}

function changeSubscriptionCalendar(offset){subscriptionCalendarOffset+=offset;renderSubscriptionCalendar()}
function selectSubscriptionCalendarDay(key){subscriptionCalendarSelectedKey=key;renderSubscriptionCalendar()}
function getSubscriptionCalendarMonthDate(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+subscriptionCalendarOffset);return d}
function subscriptionCalendarDateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function renderSubscriptionCalendar(){
  const box=document.getElementById('subscriptionCalendar');if(!box)return;
  const list=getSubscriptions().filter(s=>s.active!==false).sort((a,b)=>Number(a.day||1)-Number(b.day||1));
  if(!list.length){box.innerHTML='<div class="subscription-empty">등록된 구독 결제가 없습니다.</div>';return}
  const base=getSubscriptionCalendarMonthDate();
  const year=base.getFullYear(), month=base.getMonth();
  const first=new Date(year,month,1), last=new Date(year,month+1,0), days=last.getDate();
  const start=first.getDay();
  const today=new Date();
  const todayKey=subscriptionCalendarDateKey(today.getFullYear(),today.getMonth(),today.getDate());
  const grouped={};
  list.forEach(s=>{const day=Math.min(days,Math.max(1,Number(s.day||1)));const key=subscriptionCalendarDateKey(year,month,day);grouped[key]=grouped[key]||[];grouped[key].push(s)});
  if(!subscriptionCalendarSelectedKey){
    const sameMonth=today.getFullYear()===year&&today.getMonth()===month;
    subscriptionCalendarSelectedKey=sameMonth?todayKey:subscriptionCalendarDateKey(year,month,1);
  }
  if(subscriptionCalendarSelectedKey.slice(0,7)!==subscriptionCalendarDateKey(year,month,1).slice(0,7)) subscriptionCalendarSelectedKey=subscriptionCalendarDateKey(year,month,1);
  const monthTotal=list.reduce((a,s)=>a+subAmountWon(s),0);
  const weekNames=['일','월','화','수','목','금','토'];
  const cells=[];
  for(let i=0;i<start;i++)cells.push('<div class="sub-cal-cell empty"></div>');
  for(let day=1;day<=days;day++){
    const key=subscriptionCalendarDateKey(year,month,day);const items=grouped[key]||[];const amt=items.reduce((a,s)=>a+subAmountWon(s),0);const isToday=key===todayKey;const isSelected=key===subscriptionCalendarSelectedKey;
    cells.push(`<button class="sub-cal-cell ${items.length?'has-items':''} ${isToday?'today':''} ${isSelected?'selected':''}" onclick="selectSubscriptionCalendarDay('${key}')"><div class="sub-cal-day">${day}${isToday?'<span>오늘</span>':''}</div><div class="sub-cal-amount">${items.length?fmt(amt):'예정 없음'}</div><div class="sub-cal-count">${items.length?`${items.length}건 결제`:' '}</div></button>`)
  }
  const selectedItems=grouped[subscriptionCalendarSelectedKey]||[];
  const [sy,sm,sd]=subscriptionCalendarSelectedKey.split('-');
  const selectedTitle=`${Number(sm)}월 ${Number(sd)}일`;
  const eventHtml=selectedItems.length?`<div class="sub-cal-event-list">${selectedItems.map(s=>`<div class="sub-cal-event"><div><div class="sub-cal-event-name">${s.name||'구독'}</div><div class="sub-cal-event-meta">${subCardName(s.cardId)} · ${s.category||'구독'} · ${s.autoApply?'실적 반영 대상':'참고용'}</div></div><div class="sub-cal-event-amt">${subCurrencyLabel(s)}</div></div>`).join('')}</div>`:`<div class="sub-cal-empty-day">${selectedTitle} 예정된 구독 결제가 없습니다.</div>`;
  box.innerHTML=`<div class="sub-cal-shell"><div class="sub-cal-head"><div><div class="sub-cal-month"><span>${year}.${String(month+1).padStart(2,'0')}</span></div><div class="sub-cal-summary">이번 달 구독 ${list.length}건 · 월 총액 ${fmt(monthTotal)}</div></div><div class="sub-cal-nav"><button onclick="changeSubscriptionCalendar(-1)">‹</button><button onclick="changeSubscriptionCalendar(1)">›</button></div></div><div class="sub-cal-week">${weekNames.map(n=>`<div>${n}</div>`).join('')}</div><div class="sub-cal-grid">${cells.join('')}</div><div class="sub-cal-events"><div class="sub-cal-events-head"><div class="sub-cal-events-title">선택일 결제 예정</div><div class="sub-cal-events-sub">${selectedTitle}</div></div>${eventHtml}</div></div>`;
}
function updateSubscriptionDashboard(){const st=subscriptionStats();const set=(id,v)=>{let el=document.getElementById(id);if(el)el.innerHTML=v};set('subDashTotal',fmt(st.total));set('subDashCount',st.list.length+'건');set('subDashSoon',st.soon.length+'건');set('subDashSoonAmt',fmt(st.soonAmt)+' 예정');set('subDashAuto',st.auto.length+'건');set('subDashNext',st.next?(st.next.name||'구독'):'없음');set('subDashNextSub',st.next?`D-${subDday(st.next)} · ${fmt(subAmountWon(st.next))}`:'구독을 추가하세요');set('subPageTotal',fmt(st.total));set('subPageCount',st.list.length+'건');set('subPageWeek',st.soon.length+'건');set('subPageWeekAmt',fmt(st.soonAmt));set('subPageYearly',fmt(st.total*12));set('subPageUnapplied',st.unapplied.length+'건')}
function toggleSubscriptionListCollapse(force){if(typeof force==='boolean')subscriptionListCollapsed=force;else subscriptionListCollapsed=!subscriptionListCollapsed;const wrap=document.getElementById('subscriptionListWrap');const btn=document.getElementById('subscriptionListToggle');if(wrap)wrap.classList.toggle('hidden',subscriptionListCollapsed);if(btn)btn.textContent=subscriptionListCollapsed?'펼치기':'접기'}
function renderSubscriptions(){updateSubscriptionDashboard();renderSubscriptionCalendar();renderSubscriptionRecommendations();renderSubscriptionAnalysis();const box=document.getElementById('subscriptionList');if(!box)return;const list=getSubscriptions().sort((a,b)=>subDday(a)-subDday(b));toggleSubscriptionListCollapse(subscriptionListCollapsed);if(!list.length){box.innerHTML='<div class="subscription-empty">아직 등록된 구독 결제가 없습니다.<br><b>+ 구독 추가</b>를 눌러 Netflix, YouTube, ChatGPT 같은 반복 결제를 등록하세요.</div>';return}const key=subMonthKey();box.innerHTML=list.map(s=>{const d=subDday(s),cls=d===0?'today':(d<=7?'soon':'safe'),ap=(s.appliedMonths||{})[key];const apText=ap&&typeof ap==='object'&&ap.amount?` · 이번달 반영 완료 ${fmt(ap.amount)}`:(ap?' · 이번달 반영 완료':'');return `<div class="subscription-card"><div><div class="subscription-name">${s.name||'구독'} ${s.active===false?'<span class="currency-chip">OFF</span>':''}</div><div class="subscription-meta">매월 ${Number(s.day||1)}일 · ${subCardName(s.cardId)} · ${s.category||'구독'}<br>${s.autoApply?'실적 반영 대상':'실적 반영 안 함'} ${apText}</div><span class="subscription-dday ${cls}">${d===0?'오늘 결제':`D-${d}`}</span></div><div class="subscription-amount">${subCurrencyLabel(s)}</div><div class="subscription-actions"><button class="btn blue" onclick="openSubscription('${s.id}')">수정</button><button class="btn primary" onclick="applySubscription('${s.id}')" ${ap?'disabled':''}>실적 반영</button><button class="btn ${s.active===false?'blue':'orange'}" onclick="toggleSubscription('${s.id}')">${s.active===false?'켜기':'끄기'}</button><button class="btn red" onclick="deleteSubscription('${s.id}')">삭제</button></div></div>`}).join('')}
function openSubscription(id){const list=getSubscriptions();const s=id?list.find(x=>x.id===id):{id:'sub_'+Date.now(),name:'',amount:0,currency:'KRW',rate:1380,day:1,cardId:(data.cards&&data.cards[0]&&data.cards[0].id)||'',category:'구독',autoApply:true,active:true,appliedMonths:{}};mt.innerText=id?'구독 수정':'구독 추가';const cardOptions=(data.cards||[]).map(c=>`<option value="${c.id}" ${s.cardId===c.id?'selected':''}>${c.name}</option>`).join('');mb.innerHTML=`<div class="fg"><label>구독명</label><input id="subName" value="${s.name||''}" placeholder="예: ChatGPT Plus"></div><div class="fg"><label>금액</label><input id="subAmount" type="number" value="${Number(s.amount||0)}"></div><div class="fg"><label>통화</label><select id="subCurrency"><option value="KRW" ${s.currency==='KRW'?'selected':''}>KRW 원화</option><option value="USD" ${s.currency==='USD'?'selected':''}>USD 달러</option><option value="HKD" ${s.currency==='HKD'?'selected':''}>HKD 홍콩달러</option><option value="AUD" ${s.currency==='AUD'?'selected':''}>AUD 호주달러</option></select><div class="hint">외화는 아래 환율로 원화 환산합니다.</div></div><div class="fg"><label>환율</label><input id="subRate" type="number" value="${Number(s.rate||1380)}"></div><div class="fg"><label>매월 결제일</label><input id="subDay" type="number" min="1" max="28" value="${Number(s.day||1)}"></div><div class="fg"><label>연결 카드</label><select id="subCard">${cardOptions}</select></div><div class="fg"><label>카테고리</label><input id="subCategory" value="${s.category||'구독'}" placeholder="예: AI, 영상, 클라우드"></div><div class="fg"><label>카드 실적 반영</label><select id="subAuto"><option value="true" ${s.autoApply?'selected':''}>반영 대상</option><option value="false" ${!s.autoApply?'selected':''}>반영 안 함</option></select><div class="hint">자동으로 즉시 더하지는 않고, 구독 화면에서 '이번달 구독 실적 반영'을 눌렀을 때 중복 없이 반영합니다.</div></div><button class="btn primary" style="width:100%;margin-bottom:8px" onclick="saveSubscription('${s.id}')">저장</button>${id?`<button class="btn red" style="width:100%" onclick="deleteSubscription('${s.id}')">삭제</button>`:''}`;openModal()}
function saveSubscription(id){let list=getSubscriptions();let s=list.find(x=>x.id===id)||{id:id||'sub_'+Date.now(),appliedMonths:{}};s.name=(subName.value||'').trim()||'이름 없는 구독';s.amount=Number(subAmount.value||0);s.currency=subCurrency.value;s.rate=Number(subRate.value||1380);s.day=Math.min(28,Math.max(1,Number(subDay.value||1)));s.cardId=subCard.value;s.category=(subCategory.value||'구독').trim();s.autoApply=subAuto.value==='true';s.active=true;if(!list.find(x=>x.id===s.id))list.push(s);saveSubscriptions(list);closeModal();renderSubscriptions();render();toast('구독을 저장했습니다')}
function deleteSubscription(id){if(!confirm('이 구독을 삭제할까요?'))return;saveSubscriptions(getSubscriptions().filter(s=>s.id!==id));closeModal();renderSubscriptions();render();toast('구독을 삭제했습니다')}
function toggleSubscription(id){let list=getSubscriptions();let s=list.find(x=>x.id===id);if(!s)return;s.active=!(s.active!==false);saveSubscriptions(list);renderSubscriptions();render();toast(s.active?'구독을 켰습니다':'구독을 껐습니다')}
function applySubscription(id,opts){
  opts=opts||{};
  let list=getSubscriptions();let s=list.find(x=>x.id===id);if(!s||s.active===false||!s.cardId)return false;
  const key=subMonthKey();s.appliedMonths=s.appliedMonths||{};
  if(subscriptionApplied(s,key)){if(!opts.silent)toast('이번달 이미 반영했습니다');return false}
  let c=data.cards.find(x=>x.id===s.cardId);if(!c){if(!opts.silent)toast('연결 카드를 찾을 수 없습니다');return false}
  const amt=subAmountWon(s), before=Number(c.spent||0), appliedAt=Date.now();
  c.spent=before+amt;
  s.appliedMonths[key]={appliedAt,amount:amt,cardId:c.id,cardName:c.name,subscriptionName:s.name||'구독',before,after:c.spent,currency:s.currency||'KRW',rawAmount:Number(s.amount||0),rate:Number(s.rate||0)};
  addSubscriptionApplyLog(s,{month:key,appliedAt,amount:amt,cardId:c.id,cardName:c.name,subscriptionName:s.name||'구독',before,after:c.spent});
  data.subscriptionApplyLog=Array.isArray(data.subscriptionApplyLog)?data.subscriptionApplyLog:[];
  data.subscriptionApplyLog.unshift({month:key,appliedAt,amount:amt,cardId:c.id,cardName:c.name,subscriptionId:s.id,subscriptionName:s.name||'구독',before,after:c.spent});
  data.subscriptionApplyLog=data.subscriptionApplyLog.slice(0,100);
  updateMonthlyRecord(c);if(c.annualGoal)updateRedAnnualFromRecords();
  saveSubscriptions(list);markLocalChanged();
  if(!opts.deferRender){render();renderSubscriptions();scheduleGithubAutoBackup();}
  if(!opts.silent)toast(`${s.name} ${fmt(amt)} 실적 반영 완료`);
  return true;
}
function applyDueSubscriptions(){
  const st=subscriptionStats();const targets=st.unapplied.filter(s=>s.active!==false);
  if(!targets.length){toast('반영할 구독이 없습니다');return}
  const total=targets.reduce((a,s)=>a+subAmountWon(s),0);
  if(!confirm(`이번달 미반영 구독 ${targets.length}건, 총 ${fmt(total)}을 연결 카드 실적에 더할까요?`))return;
  let applied=0;targets.forEach(s=>{if(applySubscription(s.id,{silent:true,deferRender:true}))applied++});
  render();renderSubscriptions();scheduleGithubAutoBackup();toast(`구독 ${applied}건 실적 반영 완료`);
}

const defaultCards=[
{id:'red',name:'SC제일은행-the Red',short:'RED',color:'#e11d48',target:300000,spent:1048382,hidden:false,kind:'normal',periodType:'hyundai',collapsed:true,memo:'연 1,200만원 실적 목표',group:'현대',annualGoal:12000000,annualSpent:1048382},
{id:'mboost',name:'SC 현대카드 M BOOST',short:'M',color:'#0ea5e9',target:500000,spent:491966,hidden:false,kind:'mboost',mPoint:0,periodType:'hyundai',collapsed:false,memo:'간편결제 5% M포인트 확인',group:'현대'},
{id:'woori',name:'LG전자 우리카드',short:'W',color:'#94a3b8',target:300000,spent:318300,hidden:true,kind:'normal',periodType:'monthly',collapsed:true,memo:'30만원 정기결제용',group:'자동결제'},
{id:'lotte',name:'스페셜 롯데카드(LG전자)',short:'L',color:'#a855f7',target:300000,spent:297000,hidden:false,kind:'normal',periodType:'monthly',collapsed:true,memo:'',group:'자동결제'},
{id:'ssg',name:'SSG닷컴 삼성카드',short:'SSG',color:'#f97316',target:100000,spent:49185,hidden:false,kind:'normal',periodType:'monthly',collapsed:true,memo:'',group:'생활'},
{id:'kakao',name:'카카오페이신용카드',short:'K',color:'#22c55e',target:200000,spent:48800,hidden:false,kind:'normal',periodType:'monthly',collapsed:true,memo:'',group:'생활'},
{id:'hipass',name:'카드의정석2 후불하이패스+',short:'H',color:'#0ea5e9',target:100000,spent:0,hidden:false,kind:'normal',periodType:'monthly',collapsed:true,memo:'',group:'교통'}];
let data=load(), editing=null, dragId=null, showHidden=false;
function load(){try{let r=localStorage.getItem(STORE)||localStorage.getItem('benefit-manager-v4.2')||localStorage.getItem('benefit-manager-v3.3')||localStorage.getItem('benefit-manager-v2.3')||localStorage.getItem('benefit-manager-v2.1')||localStorage.getItem('benefit-manager-v2.0');if(r){let d=JSON.parse(r);if(d.pinMboost===undefined)d.pinMboost=true;if(!d.cards||!Array.isArray(d.cards)||d.cards.length===0)d.cards=JSON.parse(JSON.stringify(defaultCards));if(!d.history)d.history=[];if(!d.monthlyRecords)d.monthlyRecords={};if(!d.groups)d.groups=[...defaultGroups];if(d.lastBackupAt===undefined)d.lastBackupAt=null;d.cards.forEach(c=>{if(c.id==='mboost'||c.kind==='mboost'){if(c.mPoint===undefined)c.mPoint=0;if(c.mPointEarned===undefined)c.mPointEarned=0;if(c.mPointUsed===undefined)c.mPointUsed=0;}if(c.hidden===undefined)c.hidden=!!c.hide;if(!c.periodType)c.periodType=(c.id==='red'||c.id==='mboost'||/현대|Hyundai|M BOOST|Red/i.test(c.name))?'hyundai':'monthly';if(c.collapsed===undefined)c.collapsed=(c.kind==='mboost'?false:true);if(c.memo===undefined)c.memo='';if(!c.group)c.group=(c.periodType==='hyundai'?'현대':'기타');if(c.id==='red'||/red|레드/i.test(c.name)){if(c.annualGoal===undefined)c.annualGoal=12000000;if(c.annualSpent===undefined)c.annualSpent=Number(c.spent||0)}});return d}}catch(e){}return{pinMboost:true,history:[],monthlyRecords:{},lastBackupAt:null,groups:[...defaultGroups],cards:JSON.parse(JSON.stringify(defaultCards))}}
function save(){localStorage.setItem(STORE,JSON.stringify(data))}
function fmt(n){return Math.round(Number(n||0)).toLocaleString('ko-KR')+'원'}function num(n){return Math.round(Number(n||0)).toLocaleString('ko-KR')}
function getPeriod(type){let now=new Date(),y=now.getFullYear(),m=now.getMonth(),start,end,labelName;if(type==='hyundai'){start=new Date(y,m-1,24);end=new Date(y,m,23);if(now.getDate()>23){start=new Date(y,m,24);end=new Date(y,m+1,23)}labelName='현대 24~23'}else{start=new Date(y,m,1);end=new Date(y,m+1,0);labelName='월 1일~말일'}let dleft=Math.max(0,Math.ceil((new Date(end.getFullYear(),end.getMonth(),end.getDate()+1)-new Date(y,m,now.getDate()))/86400000)-1);let key=type+'_'+start.toISOString().slice(0,10)+'_'+end.toISOString().slice(0,10);let label=`${start.getFullYear()}.${String(start.getMonth()+1).padStart(2,'0')}.${String(start.getDate()).padStart(2,'0')} ~ ${end.getFullYear()}.${String(end.getMonth()+1).padStart(2,'0')}.${String(end.getDate()).padStart(2,'0')}`;return{key,dleft,label,labelName}}

function currentMonthKey(type){
  const p=getPeriod(type||'monthly');
  return p.key;
}
function cardMonthKey(card){
  return currentMonthKey(card.periodType||'monthly');
}
function ensureMonthly(){
  if(!data.monthlyRecords)data.monthlyRecords={};
}
function updateMonthlyRecord(card){
  ensureMonthly();
  const key=cardMonthKey(card);
  if(!data.monthlyRecords[card.id])data.monthlyRecords[card.id]={};
  data.monthlyRecords[card.id][key]={
    label:getPeriod(card.periodType||'monthly').label,
    spent:Number(card.spent||0),
    target:Number(card.target||0),
    savedAt:new Date().toLocaleString('ko-KR')
  };
}
function annualFromRecords(card){
  ensureMonthly();
  const y=new Date().getFullYear();
  const rec=data.monthlyRecords[card.id]||{};
  let sum=0, rows=[];
  Object.entries(rec).forEach(([k,v])=>{
    if(String(k).includes(String(y))){
      sum+=Number(v.spent||0);
      rows.push({key:k,label:v.label,spent:Number(v.spent||0)});
    }
  });
  rows.sort((a,b)=>b.key.localeCompare(a.key));
  return {sum,rows};
}
function updateRedAnnualFromRecords(){
  data.cards.forEach(c=>{
    if(c.annualGoal||c.id==='red'||/red|레드/i.test(c.name)){
      const a=annualFromRecords(c);
      if(a.sum>0)c.annualSpent=a.sum;
    }
  });
}
function backupWarning(){
  const el=document.getElementById('backupWarn');
  if(!el)return;
  if(!data.lastBackupAt){el.classList.add('show');el.innerHTML='⚠️ 아직 백업 기록이 없습니다. Safari 데이터 삭제에 대비해 백업을 권장합니다.';return;}
  const days=Math.floor((Date.now()-Number(data.lastBackupAt))/(1000*60*60*24));
  if(days>=14){el.classList.add('show');el.innerHTML=`⚠️ 마지막 백업 후 ${days}일 지났습니다. 백업을 권장합니다.`}
  else{el.classList.remove('show');el.innerHTML=''}
}

function saveSnapshot(reason){let hy=getPeriod('hyundai'),mo=getPeriod('monthly');data.history=data.history||[];data.history.unshift({time:new Date().toLocaleString('ko-KR'),reason,hyundai:hy.label,monthly:mo.label,total:data.cards.filter(c=>!c.hidden).reduce((s,c)=>s+Number(c.spent||0),0),cards:data.cards.map(c=>({name:c.name,spent:c.spent,target:c.target,mPoint:c.mPoint||0,annualSpent:c.annualSpent||0,annualGoal:c.annualGoal||0}))});data.history=data.history.slice(0,12)}
function periodKeyOf(type){return getPeriod(type||'monthly').key}
function resetCardsForType(type,reason){
  const targets=data.cards.filter(c=>(c.periodType==='hyundai'?'hyundai':'monthly')===type);
  if(!targets.length)return [];
  targets.forEach(c=>updateMonthlyRecord(c));
  saveSnapshot(reason+' · '+targets.map(c=>c.name+' '+fmt(c.spent||0)).join(', '));
  targets.forEach(c=>{
    c.spent=0;
    if(c.kind==='mboost'){c.mPoint=0;c.mPointEarned=0;c.mPointUsed=0};
  });
  return targets.map(c=>c.name);
}
function setPeriodMarker(type,key){
  let hy=getPeriod('hyundai'),mo=getPeriod('monthly');
  let saved=parsePeriodMarker();
  saved.hyundai= type==='hyundai'?key:(saved.hyundai||hy.key);
  saved.monthly= type==='monthly'?key:(saved.monthly||mo.key);
  localStorage.setItem(MONTH, saved.hyundai+'|'+saved.monthly);
}
function parsePeriodMarker(){
  let hy=getPeriod('hyundai'),mo=getPeriod('monthly'),last=localStorage.getItem(MONTH)||'';
  let parts=last.split('|');
  return {hyundai:parts[0]||hy.key, monthly:parts[1]||mo.key};
}
function autoReset(){
  let hy=getPeriod('hyundai'),mo=getPeriod('monthly');
  let lastRaw=localStorage.getItem(MONTH);
  if(!lastRaw){localStorage.setItem(MONTH,hy.key+'|'+mo.key);return}
  let saved=parsePeriodMarker();
  let changed=[];
  if(saved.hyundai!==hy.key){changed=changed.concat(resetCardsForType('hyundai','현대카드 자동 기간 전환 전 저장'));saved.hyundai=hy.key;}
  if(saved.monthly!==mo.key){changed=changed.concat(resetCardsForType('monthly','기타카드 자동 월초 전환 전 저장'));saved.monthly=mo.key;}
  localStorage.setItem(MONTH,saved.hyundai+'|'+saved.monthly);
  if(changed.length){save();toast(changed.length+'개 카드의 새 산정기간을 적용했습니다');scheduleGithubAutoBackup()}
}
function pct(a,b){return b?Math.min(100,(Number(a||0)/Number(b))*100):0}
function deadlineStatus(card, remainAmt){
  const d=getPeriod(card.periodType||'monthly').dleft;
  if(remainAmt<=0)return {cls:'clear',text:'실적 목표 달성'};
  if(d<=3)return {cls:'danger',text:`마감 D-${d} · ${fmt(remainAmt)} 부족`};
  if(d<=7)return {cls:'warn',text:`마감 D-${d} · ${fmt(remainAmt)} 부족`};
  return {cls:'safe',text:`마감 D-${d} · 여유 있음`};
}

function updateDashboard(){
 const active=data.cards.filter(c=>!c.hidden);
 let achieved=0,progress=0,shortage=0,shortageList=[],actionList=[];
 active.forEach(c=>{
   const target=Number(c.target||0), spent=Number(c.spent||0), remain=Math.max(0,target-spent), period=getPeriod(c.periodType||'monthly'), d=Math.max(1,Number(period.dleft||1));
   if(target>0 && remain<=0) achieved++;
   else if(target>0){
     progress++; shortage+=remain; shortageList.push([c.name,remain,d,c.id]);
     actionList.push({name:c.name,remain,d,daily:Math.ceil(remain/d),period:period.labelName,kind:c.kind||'normal'});
   }
 });
 shortageList=shortageList.sort((a,b)=>b[1]-a[1]).slice(0,3);
 actionList=actionList.sort((a,b)=>(a.d-b.d)||(b.remain-a.remain)).slice(0,4);
 const red=data.cards.find(c=>c.id==='red'||c.annualGoal);
 const redPct=red?pct(Number(red.annualSpent||0),Number(red.annualGoal||12000000)):0;
 const redRemain=red?Math.max(0,Number(red.annualGoal||12000000)-Number(red.annualSpent||0)):0;
 const monthsLeft=Math.max(1,12-new Date().getMonth());
 const redMonthlyNeed=Math.ceil(redRemain/monthsLeft);
 const mb=data.cards.find(c=>c.kind==='mboost');
 const mp=mb?Number(mb.mPoint||0):0;
 const mRemainPoint=Math.max(0,10000-mp);
 const mRemainWon=Math.ceil(mRemainPoint/0.05);
 const mEarned=mb?Number(mb.mPointEarned||0):0;
 const mUsed=mb?Number(mb.mPointUsed||0):0;
 const mNet=mEarned-mUsed;
 const mPct=pct(mp,10000);
 const mExpected=Math.min(10000,mp+mRemainPoint);
 const set=(id,v)=>{const e=document.getElementById(id); if(e)e.innerText=v};
 set('heroAchieved', achieved+'개 / '+active.length+'개');
 set('heroShortage', fmt(shortage));
 set('heroRed', redPct.toFixed(1)+'%');
 set('heroRedSub', fmt(redRemain)+' 남음');
 set('heroMboost', num(mp)+' M');
 set('heroMboostSub', '추가 가능 '+fmt(mRemainWon));
 set('sumShortage', fmt(shortage));
 set('sumNeedCards', progress+'개');
 set('mpDashCurrent', num(mp)+' M');
 set('mpDashRemainPoint', num(mRemainPoint)+' M');
 set('mpDashRemainWon', '추가 사용 '+fmt(mRemainWon));
 set('mpDashEarned', num(mEarned)+' M');
 set('mpDashUsed', num(mUsed)+' M');
 set('mpDashNet', '순증감 '+num(mNet)+' M');
 set('mpDashRate', '달성률 '+mPct.toFixed(1)+'%');
 set('mpDashExpected', '예상 최종 '+num(mExpected)+' M');
 const mpBar=document.getElementById('mpDashBar'); if(mpBar)mpBar.style.width=Math.min(100,mPct)+'%';
 const chips=[];
 if(actionList[0]) chips.push('🎯 우선 '+actionList[0].name+' 하루 '+fmt(actionList[0].daily));
 if(shortageList[0]) chips.push('🔥 최대 부족 '+shortageList[0][0]+' '+fmt(shortageList[0][1]));
 if(redRemain>0) chips.push('❤️ RED 월평균 '+fmt(redMonthlyNeed)); else if(red) chips.push('❤️ RED 연간 목표 달성');
 if(mRemainPoint>0) chips.push('⭐ M BOOST '+num(mRemainPoint)+' M 추가 가능');
 const danger=active.filter(c=>{const remain=Math.max(0,Number(c.target||0)-Number(c.spent||0));return remain>0&&getPeriod(c.periodType||'monthly').dleft<=7}).length;
 if(danger) chips.push('⚠️ 마감 임박 '+danger+'개');
 const strip=document.getElementById('smartStrip');
 if(strip) strip.innerHTML=(chips.length?chips:['✅ 현재 주요 경고 없음']).map(x=>`<div class="smart-chip">${x}</div>`).join('');
 const ap=document.getElementById('actionPanel');
 if(ap){
   if(actionList.length){
     ap.classList.remove('hide');
     ap.innerHTML=`<div class="action-title">오늘 먼저 볼 카드</div><div class="action-grid">${actionList.map((x,i)=>`<div class="action-item ${x.d<=3?'action-danger':x.d<=7?'action-warn':''}"><b>${i+1}. ${x.name}</b><div>${fmt(x.remain)} 부족 · D-${x.d}</div><div class="action-meta">마감까지 하루 평균 ${fmt(x.daily)} 사용 필요</div></div>`).join('')}</div>`;
   }else{
     ap.classList.remove('hide');
     ap.innerHTML='<div class="action-item action-good"><b>모든 표시 카드의 실적 목표를 달성했습니다.</b><div class="action-meta">숨김 카드는 대시보드 계산에서 제외됩니다.</div></div>';
   }
 }
 const el=document.getElementById('dashboardAlert');if(!el)return;
 el.classList.add('show');
 el.innerHTML=`<b>📊 스마트 요약</b><br>카드 ${active.length}개 · 달성 ${achieved}개 · 진행중 ${progress}개<br>총 부족액 ${fmt(shortage)}${red?`<br>RED 남은 금액 ${fmt(redRemain)} · 월평균 ${fmt(redMonthlyNeed)}`:''}`
 +(shortageList.length?`<div class="alert-list">${shortageList.map(x=>`<div class="alert-item"><b>${x[0]}</b><br>${fmt(x[1])} 부족 · D-${x[2]}</div>`).join('')}</div>`:'');
}

function updateDeadlineAlert(){
  const el=document.getElementById('deadlineAlert');if(!el)return;
  const items=data.cards.filter(c=>!c.hidden).map(c=>{
    const remain=Math.max(0,Number(c.target||0)-Number(c.spent||0));
    const d=getPeriod(c.periodType||'monthly').dleft;
    return {card:c,remain,d,status:deadlineStatus(c,remain)};
  }).filter(x=>x.remain>0 && x.d<=7);
  if(!items.length){el.classList.remove('show');el.innerHTML='';return;}
  el.classList.add('show');
  el.innerHTML=`⚠️ <b>실적 마감 임박 카드</b><div class="alert-list">${items.map(x=>`<div class="alert-item"><b>${x.card.name}</b><br>${x.status.text}</div>`).join('')}</div>`;
}

function statusClass(p){if(p>=100)return'green';if(p>=80)return'orange';return'red'}
function orderedCards(){let arr=[...data.cards];if(data.pinMboost){arr.sort((a,b)=>{if(a.kind==='mboost')return-1;if(b.kind==='mboost')return 1;return 0})}return arr}
function filteredCards(){let q=(search.value||'').toLowerCase().trim();return orderedCards().filter(c=>(showHidden||!c.hidden)&&(!q||(`${c.name} ${c.short} ${c.memo} ${c.group}`).toLowerCase().includes(q)))}
function render(){updateRedAnnualFromRecords();save();let hy=getPeriod('hyundai'),mo=getPeriod('monthly');periodText.innerText='현대 '+hy.label+' · 기타 '+mo.label;dDay.innerText='현대 D-'+hy.dleft;pinState.innerText=data.pinMboost?'ON':'OFF';hiddenState.innerText=showHidden?'ON':'OFF';sumSpent.innerText=fmt(data.cards.filter(c=>!c.hidden).reduce((s,c)=>s+Number(c.spent||0),0));let m=data.cards.find(c=>c.kind==='mboost'),rp=Math.max(0,10000-(m?Number(m.mPoint||0):0));sumEasyRemain.innerText=fmt(rp/0.05);cards.innerHTML='';let groups={};filteredCards().forEach(c=>(groups[c.group||'기타']=groups[c.group||'기타']||[]).push(c));Object.keys(groups).forEach(g=>{let sec=document.createElement('section');sec.className='group';sec.innerHTML=`<div class="gt">${g} <span>${groups[g].length}장</span></div><div class="cards"></div>`;let grid=sec.querySelector('.cards');groups[g].forEach(c=>grid.insertAdjacentHTML('beforeend',cardHtml(c)));cards.appendChild(sec)});attachDrag();backupWarning();updateGithubPanel();updateDeadlineAlert();updateDashboard();updateSubscriptionDashboard();renderSubscriptions()}
function cardTone(c){
  const n=(c.name||'').toLowerCase(), id=c.id||'';
  if(id==='red'||/red|레드/.test(n)) return {brand:'SC제일은행',title:'THE RED',cls:'red'};
  if(id==='mboost'||/m boost|mboost|현대/.test(n)) return {brand:'HYUNDAI CARD',title:'M BOOST',cls:'blue'};
  if(/ssg|삼성/.test(n)) return {brand:'SAMSUNG CARD',title:(c.short||'SSG.COM'),cls:'black'};
  if(/우리|woori/.test(n)) return {brand:'WOORI CARD',title:(c.short||'WOORI'),cls:'green'};
  if(/롯데|lotte/.test(n)) return {brand:'LOTTE CARD',title:(c.short||'LOTTE'),cls:'purple'};
  if(/카카오|kakao/.test(n)) return {brand:'SAMSUNG CARD',title:(c.short||'KAKAO'),cls:'yellow'};
  return {brand:c.group||'CARD',title:c.short||'CARD',cls:'slate'};
}
function cardHtml(c){
  let pr=pct(c.spent,c.target), st=statusClass(pr), cp=getPeriod(c.periodType||'monthly'), remainAmt=Math.max(0,Number(c.target||0)-Number(c.spent||0)), remainText=remainAmt>0?`실적까지 ${fmt(remainAmt)} 더 사용 필요`:'실적 목표 달성', dl=deadlineStatus(c,remainAmt), boost='', annual='';
  const tone=cardTone(c); const daily=remainAmt>0?Math.ceil(remainAmt/Math.max(1,cp.dleft)):0; const subProj=cardSubscriptionProjection(c.id); const projectedSpent=Number(c.spent||0)+subProj; const projectedRemain=Math.max(0,Number(c.target||0)-projectedSpent); const projectedPct=pct(projectedSpent,c.target);
  const recRows=Object.entries((data.monthlyRecords&&data.monthlyRecords[c.id])||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);
  const pace=remainAmt>0?`하루 ${fmt(daily)} 필요`:'이번 기간 완료'; const projectedTile=subProj>0?`<div class="ux-tile"><div class="ux-l">구독 포함 예상</div><div class="ux-v">${projectedPct.toFixed(1)}%</div><div class="ux-s">${fmt(subProj)} 예정 · 남은 ${projectedRemain>0?fmt(projectedRemain):'달성'}</div></div>`:'';
  const uxDetail=`<div class="ux-grid"><div class="ux-tile"><div class="ux-l">현재 진행률</div><div class="ux-v">${pr.toFixed(1)}%</div><div class="ux-s">${cp.labelName} 기준</div></div><div class="ux-tile"><div class="ux-l">남은 금액</div><div class="ux-v">${remainAmt>0?fmt(remainAmt):'달성'}</div><div class="ux-s">${pace}</div></div><div class="ux-tile"><div class="ux-l">마감</div><div class="ux-v">D-${cp.dleft}</div><div class="ux-s">${cp.label}</div></div>${projectedTile}</div><div class="ux-recent"><div class="ux-recent-title">최근 월별 기록</div>${recRows.length?recRows.map(([k,v])=>`<div class="month-row light"><span>${v.label}</span><b>${fmt(v.spent)}</b></div>`).join(''):'<div class="ux-empty">실적 입력 후 월별 기록이 표시됩니다.</div>'}</div>`;
  if(c.annualGoal){let as=Number(c.annualSpent||0),ag=Number(c.annualGoal||12000000),ap=pct(as,ag),ar=Math.max(0,ag-as);let arw=annualFromRecords(c).rows.slice(0,6).map(r=>`<div class="month-row"><span>${r.label}</span><b>${fmt(r.spent)}</b></div>`).join('');annual=`<div class="annual"><div class="bt"><span>연간 실적 목표</span><span>${ap.toFixed(1)}%</span></div><div class="annual-grid"><div class="annual-tile"><div class="annual-l">누적 실적</div><div class="annual-v">${fmt(as)}</div><div class="annual-s">목표 ${fmt(ag)}</div></div><div class="annual-tile"><div class="annual-l">남은 금액</div><div class="annual-v">${fmt(ar)}</div><div class="annual-s">월 평균 필요 ${fmt(ar/Math.max(1,12-new Date().getMonth()))}</div></div></div><div class="barw"><div class="bar" style="width:${ap}%"></div></div><div class="annual-note"><span>RED 연 1,200만원 목표</span><span>${ap>=100?'달성 완료':'진행 중'}</span></div>${arw?`<div class="month-list">${arw}</div>`:`<div class="month-row">월별 기록은 실적 저장 후 표시됩니다.</div>`}</div>`}
  if(c.kind==='mboost'){let mp=Math.min(10000,Number(c.mPoint||0)),earned=Number(c.mPointEarned||0),usedM=Number(c.mPointUsed||0),net=earned-usedM,remainP=Math.max(0,10000-mp),spentForPoint=mp/0.05,remain=remainP/0.05,expected=Math.round(Math.min(10000,mp+remainP)),ep=pct(mp,10000);boost=`<div class="boost"><div class="bt"><span>M BOOST M포인트</span><span>${ep.toFixed(1)}%</span></div><div class="bg"><div class="bi"><div class="bl">현재 보유/적립</div><div class="bv">${num(mp)} M</div><div class="bs">월 한도 10,000 M</div></div><div class="bi"><div class="bl">남은 적립 가능</div><div class="bv">${fmt(remain)}</div><div class="bs">잔여 ${num(remainP)} M</div></div><div class="bi"><div class="bl">이번달 적립</div><div class="bv">${num(earned)} M</div><div class="bs">예상 최종 ${num(expected)} M</div></div><div class="bi"><div class="bl">이번달 사용 / 순증감</div><div class="bv">${num(usedM)} M</div><div class="bs">순증감 ${num(net)} M</div></div></div><div class="barw"><div class="bar" style="width:${ep}%"></div></div><div class="bn"><span>5% 기준 추정 사용액 ${fmt(spentForPoint)}</span><span>예상 추가적립 ${num(remainP)} M</span></div></div>`}
  return `<div class="card wallet-card premium ${tone.cls} ${st} ${c.collapsed?'collapsed':''} ${c.hidden?'hidden-card':''}" draggable="false" data-id="${c.id}" style="--card-color:${c.color}">
    <div class="wallet-face premium-face">
      <div class="drag" draggable="true" data-id="${c.id}">☰</div>
      <div class="wallet-click" onclick="toggleCollapse('${c.id}')">
        <div class="premium-left">
          <div class="sim-chip"></div>
          <div class="brand-line">${tone.brand}</div>
          <div class="premium-title">${tone.title}</div>
          <div class="premium-cardname">${c.name}</div>
          <div class="premium-meta">${cp.labelName} · D-${cp.dleft}</div>${subProj>0?`<div class="projected-chip">구독 예상 +${fmt(subProj)}</div>`:''}
        </div>
        <div class="premium-mid">
          <div class="ring" style="--p:${Math.min(100,pr).toFixed(0)}"><span>${pr.toFixed(0)}%</span></div>
        </div>
        <div class="premium-right">
          <div class="premium-spent"><small>실적</small><b>${fmt(c.spent)}</b><span>/ ${fmt(c.target)}</span></div>
          <div class="premium-remain"><small>${remainAmt>0?'남은 금액':'상태'}</small><b>${remainAmt>0?fmt(remainAmt):'달성'}</b></div>
          <button class="chev" type="button" onclick="event.stopPropagation();toggleCollapse('${c.id}')">›</button>
        </div>
      </div>
    </div>
    <div class="premium-bar"><div style="width:${Math.min(100,pr)}%"></div></div>
    <div class="premium-note"><span>${remainText}</span>${remainAmt>0?`<b>하루 평균 ${fmt(daily)}</b>`:'<b>완료</b>'}</div>
    <div class="wallet-note"><div class="deadline ${dl.cls}">${dl.text}</div>${c.memo?`<div class="memo">${c.memo}</div>`:''}</div>
    <div class="detail">${uxDetail}${annual}${boost}<div class="row quick-actions"><button class="btn primary" onclick="openSpend('${c.id}')">실적 입력</button>${c.kind==='mboost'?`<button class="btn blue" onclick="openMPoint()">M포인트 입력</button>`:''}<button class="btn" onclick="openCard('${c.id}')">카드 수정</button><button class="btn ${c.hidden?'blue':'orange'}" onclick="toggleHidden('${c.id}')">${c.hidden?'다시 표시':'숨김'}</button><button class="btn small" onclick="moveCard('${c.id}',-1)">⬆️</button><button class="btn small" onclick="moveCard('${c.id}',1)">⬇️</button></div></div>
  </div>`
}
function attachDrag(){document.querySelectorAll('.drag').forEach(h=>{h.addEventListener('dragstart',e=>{dragId=h.dataset.id;h.closest('.card').classList.add('dragging');e.dataTransfer.effectAllowed='move'});h.addEventListener('dragend',()=>{document.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'))})});document.querySelectorAll('.card').forEach(el=>{el.addEventListener('dragover',e=>e.preventDefault());el.addEventListener('drop',e=>{e.preventDefault();let target=el.dataset.id;if(dragId&&target&&dragId!==target)moveTo(dragId,target)})})}
function moveTo(from,to){let i=data.cards.findIndex(c=>c.id===from),j=data.cards.findIndex(c=>c.id===to);if(i<0||j<0)return;let [x]=data.cards.splice(i,1);data.cards.splice(j,0,x);render();toast('순서를 변경했습니다')}
function moveCard(id,dir){let i=data.cards.findIndex(c=>c.id===id);let j=i+dir;if(i<0||j<0||j>=data.cards.length){toast('더 이동할 수 없습니다');return;}let [x]=data.cards.splice(i,1);data.cards.splice(j,0,x);render();toast('순서를 변경했습니다')}
function toggleCollapse(id){let c=data.cards.find(x=>x.id===id);c.collapsed=!c.collapsed;render()}function togglePin(){data.pinMboost=!data.pinMboost;render()}function toggleHiddenView(){showHidden=!showHidden;render()}function toggleHidden(id){let c=data.cards.find(x=>x.id===id);c.hidden=!c.hidden;markLocalChanged();render();toast(c.hidden?'숨김 처리했습니다':'다시 표시했습니다');scheduleGithubAutoBackup()}

function getGroups(){
  const set=new Set([...(data.groups||defaultGroups)]);
  data.cards.forEach(c=>{if(c.group)set.add(c.group)});
  if(!set.has('기타'))set.add('기타');
  return [...set];
}
function openGroupManager(){
  const groups=getGroups();
  mt.innerText='그룹 관리';
  mb.innerHTML=`<div class="hint" style="margin-bottom:12px">그룹명을 바꾸면 해당 그룹에 속한 카드들도 함께 이동합니다. 삭제하면 그 그룹의 카드는 '기타'로 이동합니다.</div>
  <div id="groupList">${groups.map(g=>`<div class="fg"><label>그룹명</label><div class="row" style="padding:0"><input class="groupName" data-old="${g}" value="${g}" style="flex:1"><button class="btn red" style="flex:0 0 70px" onclick="deleteGroup('${g}')">삭제</button></div></div>`).join('')}</div>
  <div class="fg"><label>새 그룹 추가</label><input id="newGroupName" placeholder="예: 해외, 구독, 가족카드"></div>
  <button class="btn blue" style="width:100%;margin-bottom:8px" onclick="addGroup()">그룹 추가</button>
  <button class="btn primary" style="width:100%" onclick="saveGroups()">저장</button>`;
  openModal();
}
function addGroup(){
  const name=(newGroupName.value||'').trim();
  if(!name){toast('그룹명을 입력하세요');return;}
  data.groups=getGroups();
  if(!data.groups.includes(name))data.groups.push(name);
  openGroupManager();
  toast('그룹을 추가했습니다');
}
function saveGroups(){
  let next=[];
  document.querySelectorAll('.groupName').forEach(inp=>{
    const old=inp.dataset.old;
    const name=(inp.value||'').trim()||'기타';
    if(!next.includes(name))next.push(name);
    data.cards.forEach(c=>{if(c.group===old)c.group=name});
  });
  if(!next.includes('기타'))next.push('기타');
  data.groups=next;
  closeModal();markLocalChanged();render();toast('그룹을 저장했습니다');scheduleGithubAutoBackup();
}
function deleteGroup(g){
  if(g==='기타'){toast('기타 그룹은 삭제할 수 없습니다');return;}
  if(!confirm(`'${g}' 그룹을 삭제할까요? 이 그룹의 카드는 기타로 이동합니다.`))return;
  data.cards.forEach(c=>{if(c.group===g)c.group='기타'});
  data.groups=getGroups().filter(x=>x!==g);
  if(!data.groups.includes('기타'))data.groups.push('기타');
  openGroupManager();
}

function openSpend(id){let c=data.cards.find(x=>x.id===id);editing=id;mt.innerText=c.name+' 실적 입력';mb.innerHTML=`<div class="fg"><label>현재 사용금액</label><input id="spendInput" type="number" value="${c.spent||0}"></div><div class="fg"><label>실적 목표</label><input id="targetInput" type="number" value="${c.target||0}"></div>${c.annualGoal?`<div class="fg"><label>연간 누적 실적</label><input id="annualSpentInput" type="number" value="${c.annualSpent||0}"><div class="hint">RED 카드 연간 누적액도 함께 수정할 수 있습니다.</div></div>`:''}<button class="btn primary" style="width:100%" onclick="saveSpend()">저장</button>`;openModal()}
function saveSpend(){let c=data.cards.find(x=>x.id===editing);c.spent=Number(spendInput.value)||0;c.target=Number(targetInput.value)||0;if(c.annualGoal&&document.getElementById('annualSpentInput'))c.annualSpent=Number(annualSpentInput.value)||0;updateMonthlyRecord(c);updateRedAnnualFromRecords();closeModal();render();markLocalChanged();toast('실적과 월별 기록을 저장했습니다');scheduleGithubAutoBackup()}
function openMPoint(){let c=data.cards.find(x=>x.kind==='mboost');mt.innerText='M BOOST M포인트 통계';mb.innerHTML=`<div class="fg"><label>현재 보유/적립 M포인트</label><input id="mpInput" type="number" value="${c.mPoint||0}"><div class="hint">예: 7,250 입력 → 추가 적립 가능 2,750 M / 추가 사용 가능 55,000원.</div></div><div class="fg"><label>이번달 적립 M포인트</label><input id="mpEarnedInput" type="number" value="${c.mPointEarned||0}"></div><div class="fg"><label>이번달 사용 M포인트</label><input id="mpUsedInput" type="number" value="${c.mPointUsed||0}"></div><button class="btn primary" style="width:100%" onclick="saveMPoint()">저장</button>`;openModal()}
function saveMPoint(){let c=data.cards.find(x=>x.kind==='mboost');c.mPoint=Number(mpInput.value)||0;c.mPointEarned=Number(mpEarnedInput.value)||0;c.mPointUsed=Number(mpUsedInput.value)||0;markLocalChanged();closeModal();render();scheduleGithubAutoBackup()}
function openCard(id){editing=id||null;let c=id?data.cards.find(x=>x.id===id):{name:'',short:'',color:COLORS[0],target:0,spent:0,hidden:false,kind:'normal',periodType:'monthly',memo:'',collapsed:true,group:'기타'};mt.innerText=id?'카드 수정':'카드 추가';mb.innerHTML=`<div class="fg"><label>카드명</label><input id="cardName" value="${c.name||''}"></div><div class="fg"><label>카드 약칭</label><input id="cardShort" value="${c.short||''}" maxlength="4"></div><div class="fg"><label>그룹</label><select id="cardGroup">${getGroups().map(g=>`<option ${g===(c.group||'기타')?'selected':''}>${g}</option>`).join('')}</select></div><div class="fg"><label>실적 목표</label><input id="cardTarget" type="number" value="${c.target||0}"></div><div class="fg"><label>현재 사용금액</label><input id="cardSpent" type="number" value="${c.spent||0}"></div><div class="fg"><label>연간 목표금액 (RED 카드용, 없으면 0)</label><input id="annualGoal" type="number" value="${c.annualGoal||0}"><div class="hint">RED 카드 연 1,200만원 목표는 12000000 입력</div></div><div class="fg"><label>연간 누적 실적</label><input id="annualSpent" type="number" value="${c.annualSpent||0}"><div class="hint">월별 히스토리와 별개로 현재까지의 누적 실적을 직접 보정할 수 있습니다.</div></div><div class="fg"><label>메모</label><textarea id="cardMemo">${c.memo||''}</textarea></div><div class="fg"><label>산정기간</label><select id="cardPeriod"><option value="monthly" ${c.periodType!=='hyundai'?'selected':''}>해당월 1일~말일</option><option value="hyundai" ${c.periodType==='hyundai'?'selected':''}>현대카드 24일~23일</option></select></div><div class="fg"><label>색상</label><select id="cardColor">${COLORS.map(x=>`<option value="${x}" ${x===c.color?'selected':''}>${x}</option>`).join('')}</select></div><div class="fg"><label>카드 종류</label><select id="cardKind"><option value="normal" ${c.kind!=='mboost'?'selected':''}>일반 실적 카드</option><option value="mboost" ${c.kind==='mboost'?'selected':''}>M BOOST 간편결제 카드</option></select></div><div class="fg"><label>표시 상태</label><select id="cardHidden"><option value="false" ${!c.hidden?'selected':''}>표시</option><option value="true" ${c.hidden?'selected':''}>숨김</option></select></div><button class="btn primary" style="width:100%;margin-bottom:8px" onclick="saveCard()">저장</button>${id?`<button class="btn red" style="width:100%" onclick="deleteCard()">삭제</button>`:''}`;openModal()}
function saveCard(){let old=editing?data.cards.find(x=>x.id===editing):null;let obj={id:editing||('card_'+Date.now()),name:cardName.value.trim()||'새 카드',short:cardShort.value.trim()||'C',group:cardGroup.value,color:cardColor.value,target:Number(cardTarget.value)||0,spent:Number(cardSpent.value)||0,hidden:cardHidden.value==='true',kind:cardKind.value,periodType:cardPeriod.value,memo:cardMemo.value.trim(),collapsed:old?old.collapsed:true,annualGoal:Number(annualGoal.value)||0,annualSpent:Number(annualSpent.value)||0};if(obj.kind==='mboost'){obj.mPoint=old&&old.mPoint?old.mPoint:0;obj.mPointEarned=old&&old.mPointEarned?old.mPointEarned:0;obj.mPointUsed=old&&old.mPointUsed?old.mPointUsed:0;}if(editing)data.cards=data.cards.map(c=>c.id===editing?obj:c);else data.cards.push(obj);markLocalChanged();closeModal();render();scheduleGithubAutoBackup()}
function deleteCard(){if(!confirm('이 카드를 삭제할까요?'))return;data.cards=data.cards.filter(c=>c.id!==editing);markLocalChanged();closeModal();render();scheduleGithubAutoBackup()}

function openHiddenManager(){
  const hidden=data.cards.filter(c=>c.hidden);
  mt.innerText='숨김 카드 관리';
  if(!hidden.length){
    mb.innerHTML='<div class="hint">숨김 처리된 카드가 없습니다.</div>';
    openModal();return;
  }
  mb.innerHTML=`<div class="hidden-list">${hidden.map(c=>`<div class="hidden-item"><b>${c.name}</b><div class="hint">${c.group||'기타'} · 목표 ${fmt(c.target)}</div><div class="row" style="padding:10px 0 0"><button class="btn blue" onclick="toggleHidden('${c.id}');openHiddenManager()">다시 표시</button><button class="btn" onclick="openCard('${c.id}')">수정</button></div></div>`).join('')}</div>`;
  openModal();
}

function historyTrendHtml(rows){
  // rows: [[key,{label,spent}], ...] sorted latest-first (already sliced to 12)
  const vals=rows.map(([k,v])=>Number(v.spent||0));
  const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  let diffHtml='';
  if(vals.length>1){
    const diff=vals[0]-vals[1];
    const diffPct=vals[1]?Math.round(Math.abs(diff)/vals[1]*100):null;
    if(diff>0)diffHtml=`<span class="hist-up">▲ ${fmt(Math.abs(diff))}${diffPct!==null?` (${diffPct}%)`:''}</span>`;
    else if(diff<0)diffHtml=`<span class="hist-down">▼ ${fmt(Math.abs(diff))}${diffPct!==null?` (${diffPct}%)`:''}</span>`;
    else diffHtml=`<span class="hist-flat">변동 없음</span>`;
  }
  const summaryHtml=`<div class="hist-summary">최근 ${vals.length}개월 평균 <b>${fmt(Math.round(avg))}</b>${diffHtml?' · 전월 대비 '+diffHtml:''}</div>`;
  const sparkVals=rows.slice(0,6).map(([k,v])=>Number(v.spent||0)).reverse();
  const maxV=Math.max(1,...sparkVals);
  const sparkHtml=sparkVals.length>1?`<div class="spark-row">${sparkVals.map(v=>`<div class="spark-bar" style="height:${Math.max(6,Math.round(v/maxV*100))}%" title="${fmt(v)}"></div>`).join('')}</div>`:'';
  return summaryHtml+sparkHtml;
}
function filterHistoryCards(){
  const q=(document.getElementById('historyFilter')?.value||'').trim().toLowerCase();
  document.querySelectorAll('.history-card-block').forEach(el=>{
    el.style.display=(!q||(el.dataset.cardName||'').includes(q))?'':'none';
  });
}
function showHistory(){ensureMonthly();mt.innerText='월별 히스토리';let parts=[];const hasCards=data.cards.some(c=>{const rec=data.monthlyRecords[c.id]||{};return Object.keys(rec).length>0});if(hasCards)parts.push(`<div class="hist-filter-wrap fg"><input id="historyFilter" placeholder="카드명 검색" oninput="filterHistoryCards()"></div>`);data.cards.forEach(c=>{let rec=data.monthlyRecords[c.id]||{};let rows=Object.entries(rec).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12);if(rows.length){parts.push(`<div class="notice history-card-block" data-card-name="${(c.name||'').toLowerCase()}"><b>${c.name}</b>${historyTrendHtml(rows)}${rows.map(([k,v])=>`<div class="month-row light"><span>${v.label}</span><b>${fmt(v.spent)}</b></div>`).join('')}</div>`)}});let slog=Array.isArray(data.subscriptionApplyLog)?data.subscriptionApplyLog.slice(0,20):[];if(slog.length){parts.push(`<div class="notice"><b>구독 실적 반영 로그</b>${slog.map(x=>`<div class="month-row light"><span>${x.month} · ${x.subscriptionName}<br>${x.cardName} · ${new Date(x.appliedAt).toLocaleString('ko-KR')}</span><b>${fmt(x.amount)}</b></div>`).join('')}</div>`)}let h=data.history||[];if(h.length){parts.push(`<div class="notice"><b>초기화 스냅샷</b>${h.map(x=>`<div class="month-row light"><span>${x.time}<br>${x.reason}</span><b>${fmt(x.total)}</b></div>`).join('')}</div>`)}mb.innerHTML=parts.length?parts.join(''):'<div class="hint">저장된 히스토리가 없습니다. 실적 입력 후 저장하면 카드별 월별 기록이 표시됩니다.</div>';openModal()}

function getGithubConfig(){try{return JSON.parse(localStorage.getItem(GHCFG)||'{}')}catch(e){return {}}}
function saveGithubConfig(cfg){localStorage.setItem(GHCFG,JSON.stringify(cfg))}
function githubHeaders(token){return {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json'}}
function githubPath(cfg){return cfg.path||'backups/card-benefit-backup.json'}
function githubApiBase(cfg){return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${githubPath(cfg)}`}
function b64EncodeUnicode(str){return btoa(unescape(encodeURIComponent(str)))}
function b64DecodeUnicode(str){return decodeURIComponent(escape(atob(str.replace(/\n/g,''))))}
function getDeviceId(){let id=localStorage.getItem('benefit-manager-device-id');if(!id){id='dev_'+Date.now()+'_'+Math.random().toString(16).slice(2);localStorage.setItem('benefit-manager-device-id',id)}return id}
function getDeviceName(){let n=localStorage.getItem('benefit-manager-device-name');if(!n){n=(/iPad/i.test(navigator.userAgent)?'iPad':/iPhone/i.test(navigator.userAgent)?'iPhone':'Device');localStorage.setItem('benefit-manager-device-name',n)}return n}
function markLocalChanged(){data.meta=data.meta||{};data.meta.updatedAt=Date.now();data.meta.deviceId=getDeviceId();data.meta.deviceName=getDeviceName();save()}
function exportDataForGithub(){data.meta=data.meta||{};data.meta.savedAt=Date.now();data.meta.deviceId=getDeviceId();data.meta.deviceName=getDeviceName();return JSON.stringify({app:'card-benefit-manager',version:APP_VERSION,savedAt:new Date().toISOString(),savedAtMs:Date.now(),deviceId:getDeviceId(),deviceName:getDeviceName(),data:data,subscriptions:getSubscriptions()},null,2)}

let remoteInfoCache=null;
async function getGithubBackupPayload(cfg){
  const f=await githubGetFile(cfg);
  if(!f||!f.content)return null;
  const parsed=JSON.parse(b64DecodeUnicode(f.content));
  return parsed;
}
function localUpdatedAt(){
  return Number(data?.meta?.updatedAt || data?.lastBackupAt || 0);
}
function remoteUpdatedAt(payload){
  return Number(payload?.savedAtMs || payload?.data?.meta?.savedAt || payload?.data?.meta?.updatedAt || 0);
}
function updateSyncPanel(payload=null){
  const el=document.getElementById('syncPanel');if(!el)return;
  const cfg=getGithubConfig();
  if(!cfg.owner||!cfg.repo||!cfg.token){el.className='sync-panel';el.innerHTML='';return;}
  if(!payload){el.className='sync-panel show';el.innerHTML='🔄 <b>동기화 상태</b><br>GitHub 최신 여부를 확인할 수 있습니다. <div class="sync-actions"><button onclick="checkGithubLatest(false)">최신 확인</button></div>';return;}
  const r=remoteUpdatedAt(payload), l=localUpdatedAt();
  const rdev=payload.deviceName || payload.data?.meta?.deviceName || '알 수 없음';
  if(r>l+1500){
    el.className='sync-panel show warn';
    el.innerHTML=`⚠️ <b>GitHub에 더 최신 데이터가 있습니다.</b><br>GitHub: ${new Date(r).toLocaleString('ko-KR')} (${rdev})<br>현재 기기: ${l?new Date(l).toLocaleString('ko-KR'):'기록 없음'}<div class="sync-actions"><button onclick="restoreRemoteCached()">GitHub 최신 데이터 불러오기</button><button onclick="githubBackup(true,true)">그래도 덮어쓰기</button></div>`;
  }else{
    el.className='sync-panel show';
    el.innerHTML=`✅ <b>동기화 상태 양호</b><br>GitHub 백업: ${r?new Date(r).toLocaleString('ko-KR'):'없음'} (${rdev})<div class="sync-actions"><button onclick="checkGithubLatest(false)">다시 확인</button></div>`;
  }
}
async function checkGithubLatest(silent=true){
  const cfg=getGithubConfig();
  if(!cfg.owner||!cfg.repo||!cfg.token){if(!silent)alert('GitHub 설정을 먼저 입력하세요.');return null;}
  try{
    const payload=await getGithubBackupPayload(cfg);
    remoteInfoCache=payload;
    updateSyncPanel(payload);
    if(!silent)toast('최신 여부 확인 완료');
    return payload;
  }catch(e){
    const el=document.getElementById('syncPanel');if(el){el.className='sync-panel show danger';el.innerHTML='GitHub 최신 확인 실패: '+e.message}
    if(!silent)alert(e.message);
    return null;
  }
}
function restoreRemoteCached(){
  if(!remoteInfoCache){checkGithubLatest(false);return;}
  if(!confirm('GitHub 최신 데이터로 현재 기기 데이터를 덮어쓸까요?'))return;
  data=remoteInfoCache.data||remoteInfoCache;
  if(!data.cards||!data.cards.length)data.cards=JSON.parse(JSON.stringify(defaultCards));
  data.meta=data.meta||{};data.meta.updatedAt=remoteUpdatedAt(remoteInfoCache)||Date.now();
  save();render();toast('GitHub 최신 데이터를 불러왔습니다');
}

function updateGithubPanel(){const el=document.getElementById('githubPanel');if(!el)return;const cfg=getGithubConfig();if(!cfg.owner||!cfg.repo||!cfg.token){el.innerHTML='☁️ <b>GitHub 백업 미설정</b><br>GitHub 설정에서 ID, Repository, Token을 입력하면 클라우드 백업/복원이 가능합니다.';return;}el.innerHTML=`☁️ <b>GitHub 백업 설정됨</b><br>${cfg.owner}/${cfg.repo}<br>경로: ${githubPath(cfg)} · 자동백업 ${cfg.autoBackup?'ON':'OFF'}<br>마지막 GitHub 백업: ${cfg.lastGithubBackup?new Date(cfg.lastGithubBackup).toLocaleString('ko-KR'):'없음'}`}
function openGithubSettings(){const cfg=getGithubConfig();mt.innerText='GitHub 백업 설정';mb.innerHTML=`<div class="hint" style="margin-bottom:12px">토큰은 이 기기 LocalStorage에만 저장됩니다. 앱 주소를 다른 사람과 공유하지 마세요.</div><div class="fg"><label>GitHub ID / Owner</label><input id="ghOwner" value="${cfg.owner||'Justin-1984'}"></div><div class="fg"><label>Repository</label><input id="ghRepo" value="${cfg.repo||'card-Benefit-manager'}"></div><div class="fg"><label>Branch</label><input id="ghBranch" value="${cfg.branch||'main'}"></div><div class="fg"><label>백업 파일 경로</label><input id="ghPath" value="${cfg.path||'backups/card-benefit-backup.json'}"></div><div class="fg"><label>Fine-grained PAT Token</label><input id="ghToken" type="password" value="${cfg.token||''}" placeholder="github_pat_..."></div><div class="fg"><label>자동 백업</label><select id="ghAuto"><option value="true" ${cfg.autoBackup?'selected':''}>ON</option><option value="false" ${!cfg.autoBackup?'selected':''}>OFF</option></select><div class="hint">실적/카드 수정 후 자동으로 GitHub 백업을 시도합니다.</div></div><button class="btn primary" style="width:100%;margin-bottom:8px" onclick="saveGithubSettings()">설정 저장</button><button class="btn blue" style="width:100%;margin-bottom:8px" onclick="githubTest()">연결 테스트</button><button class="btn red" style="width:100%" onclick="clearGithubSettings()">GitHub 설정 삭제</button>`;openModal()}
function saveGithubSettings(){const cfg={owner:ghOwner.value.trim(),repo:ghRepo.value.trim(),branch:ghBranch.value.trim()||'main',path:ghPath.value.trim()||'backups/card-benefit-backup.json',token:ghToken.value.trim(),autoBackup:ghAuto.value==='true',lastGithubBackup:getGithubConfig().lastGithubBackup||null};saveGithubConfig(cfg);closeModal();updateGithubPanel();toast('GitHub 설정을 저장했습니다')}
function clearGithubSettings(){if(!confirm('GitHub 토큰과 설정을 삭제할까요?'))return;localStorage.removeItem(GHCFG);closeModal();updateGithubPanel();toast('GitHub 설정을 삭제했습니다')}
async function githubGetFile(cfg){const url=githubApiBase(cfg)+'?ref='+encodeURIComponent(cfg.branch||'main');const r=await fetch(url,{headers:githubHeaders(cfg.token)});if(r.status===404)return null;if(!r.ok)throw new Error('GitHub 파일 조회 실패: '+r.status);return await r.json()}
async function githubPutFile(cfg,content,message){const existing=await githubGetFile(cfg);const body={message:message||'Update card benefit backup',content:b64EncodeUnicode(content),branch:cfg.branch||'main'};if(existing&&existing.sha)body.sha=existing.sha;const r=await fetch(githubApiBase(cfg),{method:'PUT',headers:githubHeaders(cfg.token),body:JSON.stringify(body)});if(!r.ok){const t=await r.text();throw new Error('GitHub 저장 실패: '+r.status+' '+t.slice(0,160))}return await r.json()}
async function githubBackup(silent=false,force=false){const cfg=getGithubConfig();if(!cfg.owner||!cfg.repo||!cfg.token){if(!silent)alert('GitHub 설정을 먼저 입력하세요.');return false;}try{if(!force){const payload=await checkGithubLatest(true);if(payload&&remoteUpdatedAt(payload)>localUpdatedAt()+1500){if(!silent)alert('GitHub에 더 최신 데이터가 있습니다. 먼저 복원하거나, 동기화 안내에서 그래도 덮어쓰기를 선택하세요.');return false;}}markLocalChanged();await githubPutFile(cfg,exportDataForGithub(),'Backup card benefit data');cfg.lastGithubBackup=Date.now();saveGithubConfig(cfg);data.lastBackupAt=Date.now();data.meta=data.meta||{};data.meta.savedAt=Date.now();save();remoteInfoCache=null;updateGithubPanel();backupWarning();checkGithubLatest(true);if(!silent)toast('GitHub 백업 완료');return true}catch(e){if(!silent)alert(e.message);return false}}
async function githubRestore(){const cfg=getGithubConfig();if(!cfg.owner||!cfg.repo||!cfg.token){alert('GitHub 설정을 먼저 입력하세요.');return;}if(!confirm('GitHub 백업 데이터로 현재 데이터를 덮어쓸까요? 현재 데이터는 자동백업으로 먼저 보관됩니다.'))return;try{const parsed=await getGithubBackupPayload(cfg);if(!parsed){alert('GitHub 백업 파일이 없습니다.');return;}makeAutoBackup('GitHub 복원 전 저장');data=parsed.data||parsed;if(parsed.subscriptions)saveSubscriptions(parsed.subscriptions);if(!data.cards||!data.cards.length)data.cards=JSON.parse(JSON.stringify(defaultCards));data.meta=data.meta||{};data.meta.updatedAt=remoteUpdatedAt(parsed)||Date.now();save();render();toast('GitHub에서 복원했습니다')}catch(e){alert(e.message)}}
async function githubTest(){const cfg={owner:ghOwner.value.trim(),repo:ghRepo.value.trim(),branch:ghBranch.value.trim()||'main',path:ghPath.value.trim()||'backups/card-benefit-backup.json',token:ghToken.value.trim(),autoBackup:ghAuto.value==='true'};try{const url=`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;const r=await fetch(url,{headers:githubHeaders(cfg.token)});if(!r.ok)throw new Error('연결 실패: '+r.status);toast('GitHub 연결 성공')}catch(e){alert(e.message)}}
let autoBackupTimer=null;function scheduleGithubAutoBackup(){const cfg=getGithubConfig();if(!cfg.autoBackup||!cfg.owner||!cfg.repo||!cfg.token)return;clearTimeout(autoBackupTimer);autoBackupTimer=setTimeout(()=>githubBackup(true),2500)}


let latestAppInfo=null;
function updateAppPanel(message,extra){
  const el=document.getElementById('updatePanel'); if(!el)return;
  const now=new Date().toLocaleString('ko-KR');
  const notes=(latestAppInfo&&latestAppInfo.releaseNotes&&latestAppInfo.releaseNotes.length)?'<br><b>릴리즈 노트</b><br>• '+latestAppInfo.releaseNotes.join('<br>• '):'';
  const releaseDate=(latestAppInfo&&latestAppInfo.releaseDate)?latestAppInfo.releaseDate:'2026-06-27';
  el.innerHTML='<b>앱 정보</b><br>현재 버전 v'+APP_VERSION+' Beta · Build '+APP_BUILD+'<br>Data Version '+DATA_VERSION+'<br>업데이트 날짜 '+releaseDate+'<br>'+(message||'업데이트 확인 전입니다.')+notes+(extra?'<div class="sync-actions">'+extra+'</div>':'')+'<br><span style="font-size:11px;color:#6b7280">마지막 확인: '+now+'</span>';
}
function compareBuild(info){
  const b=Number(info&&info.build||String(info&&info.version||'').replace(/\D/g,'')||0);
  return b-APP_BUILD;
}
async function checkAppUpdate(manual){
  try{
    const r=await fetch('./version.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('version.json 확인 실패: '+r.status);
    const info=await r.json(); latestAppInfo=info;
    const diff=compareBuild(info);
    if(diff>0){
      updateAppPanel('새 버전 v'+(info.version||'')+' 발견<br>'+((info.message||'').replace(/\n/g,'<br>')),'<button onclick="applyAppUpdate()">업데이트 적용</button>');
      if(manual)toast('새 업데이트가 있습니다');
    }else{
      updateAppPanel('현재 최신 버전입니다.<br>서버 버전 v'+(info.version||APP_VERSION));
      if(manual)toast('현재 최신 버전입니다');
    }
  }catch(e){
    updateAppPanel('업데이트 확인 실패<br>'+e.message);
    if(manual)alert(e.message);
  }
}
function savePreUpdateBackup(){
  try{
    const payload={time:new Date().toISOString(),version:APP_VERSION,data:data};
    localStorage.setItem(PRE_UPDATE_BACKUP,JSON.stringify(payload));
    return true;
  }catch(e){return false;}
}

function makeAutoBackup(reason){
  try{
    const list=JSON.parse(localStorage.getItem(AUTO_BACKUPS)||'[]');
    list.unshift({id:'ab_'+Date.now(),time:new Date().toISOString(),label:new Date().toLocaleString('ko-KR'),reason:reason||'자동 백업',version:APP_VERSION,data:JSON.parse(JSON.stringify(data))});
    localStorage.setItem(AUTO_BACKUPS,JSON.stringify(list.slice(0,10)));
    return true;
  }catch(e){return false;}
}
function getAutoBackups(){try{return JSON.parse(localStorage.getItem(AUTO_BACKUPS)||'[]')}catch(e){return[]}}
function openAutoBackups(){
  const list=getAutoBackups();
  mt.innerText='자동 백업 / 원클릭 복원';
  mb.innerHTML=`<div class="hint" style="margin-bottom:12px">업데이트·리셋·복원 직전에 자동으로 최대 10개까지 보관합니다. GitHub 백업과 별도로 이 기기 안에 저장됩니다.</div>`+
  (list.length?`<div class="hidden-list">${list.map((b,i)=>`<div class="hidden-item"><b>${b.label}</b><br><span class="hint">${b.reason} · v${b.version||''}</span><div class="row" style="margin-top:8px"><button class="btn blue" onclick="restoreAutoBackup(${i})">복원</button></div></div>`).join('')}</div>`:'<div class="hint">아직 자동 백업이 없습니다.</div>')+
  `<button class="btn primary" style="width:100%;margin-top:12px" onclick="makeManualAutoBackup()">현재 상태를 자동백업 목록에 저장</button>`;
  openModal();
}
function makeManualAutoBackup(){makeAutoBackup('사용자 수동 보관');closeModal();toast('자동백업 목록에 저장했습니다')}
function restoreAutoBackup(index){
  const list=getAutoBackups(); const b=list[index]; if(!b||!b.data){alert('백업 데이터가 없습니다.');return;}
  if(!confirm('선택한 자동백업으로 복원할까요? 현재 데이터는 먼저 자동백업으로 보관됩니다.'))return;
  makeAutoBackup('자동백업 복원 직전 저장');
  data=b.data; save(); closeModal(); render(); toast('자동백업에서 복원했습니다');
}
async function applyAppUpdate(){
  if(!confirm('업데이트 적용 전에 현재 데이터를 로컬 안전백업으로 저장하고 캐시를 새로고침합니다. 계속할까요?'))return;
  savePreUpdateBackup();
  makeAutoBackup('업데이트 적용 전 저장');
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.update().catch(()=>{})));
    }
    if(window.caches){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>/benefit-manager/i.test(k)).map(k=>caches.delete(k)));
    }
  }catch(e){}
  const next=(latestAppInfo&&latestAppInfo.build)?latestAppInfo.build:Date.now();
  location.href=location.pathname+'?v='+next;
}
function restorePreUpdateBackup(){
  try{
    const raw=localStorage.getItem(PRE_UPDATE_BACKUP); if(!raw){alert('업데이트 전 백업이 없습니다.');return;}
    const payload=JSON.parse(raw); if(!payload.data){alert('백업 데이터 형식이 올바르지 않습니다.');return;}
    if(!confirm('업데이트 전 로컬 백업으로 복원할까요? 현재 화면 데이터는 덮어써집니다.'))return;
    data=payload.data; save(); render(); toast('업데이트 전 백업으로 복원했습니다');
  }catch(e){alert('복원 실패: '+e.message)}
}

function openModal(){modal.style.display='flex'}function closeModal(){modal.style.display='none'}
function resetPeriodCards(type,manual){
  const label=type==='hyundai'?'현대카드':'기타카드';
  const p=getPeriod(type);
  const targets=data.cards.filter(c=>(c.periodType==='hyundai'?'hyundai':'monthly')===type);
  if(manual){
    if(!targets.length){alert(label+' 대상 카드가 없습니다.');return;}
    const list=targets.map(c=>'• '+c.name+' : '+fmt(c.spent||0)).join('\n');
    const msg=label+'만 현재 산정기간으로 전환합니다.\n\n저장될 기간: '+p.label+'\n\n리셋 전 월별 히스토리에 저장될 금액:\n'+list+'\n\n다른 카드는 변경하지 않습니다.\n계속할까요?';
    if(!confirm(msg))return;
    makeAutoBackup(label+' 리셋 전 저장');
  }
  const changed=resetCardsForType(type,label+' 수동 기간 전환 전 저장');
  setPeriodMarker(type,p.key);
  markLocalChanged();
  render();
  scheduleGithubAutoBackup();
  toast(changed.length?label+'만 전환했습니다':'전환할 카드가 없습니다');
}
function resetMonth(all){
  if(!confirm(all?'전체 데이터를 기본값으로 초기화할까요?':'모든 카드의 현재 사용금액/M포인트를 초기화할까요? 현대/기타가 모두 초기화됩니다.'))return;
  makeAutoBackup(all?'전체 초기화 전 저장':'사용금액 초기화 전 저장');
  if(all){data={pinMboost:true,history:[],monthlyRecords:{},lastBackupAt:null,groups:[...defaultGroups],cards:JSON.parse(JSON.stringify(defaultCards))}}
  else{data.cards.forEach(c=>updateMonthlyRecord(c));saveSnapshot('전체 수동 초기화 전 저장');data.cards.forEach(c=>{c.spent=0;if(c.kind==='mboost'){c.mPoint=0;c.mPointEarned=0;c.mPointUsed=0}})}
  markLocalChanged();localStorage.setItem(MONTH,getPeriod('hyundai').key+'|'+getPeriod('monthly').key);render();scheduleGithubAutoBackup()
}
function backup(){data.lastBackupAt=Date.now();save();let payload={app:'card-benefit-manager',version:APP_VERSION,savedAt:new Date().toISOString(),data:data,subscriptions:getSubscriptions()};let b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='card-benefit-backup.json';a.click();render();updateGithubPanel();toast('백업 파일을 만들었습니다')}
function restore(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{makeAutoBackup('파일 복원 전 저장');let parsed=JSON.parse(r.result);data=parsed.data||parsed;if(parsed.subscriptions)saveSubscriptions(parsed.subscriptions);save();render();renderSubscriptions();toast('복원했습니다')}catch(err){alert('복원 실패')}};r.readAsText(f)}
function toast(msg){let t=document.getElementById('toast');t.innerText=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}

function applyResponsiveLayout(){
  const w=window.innerWidth||document.documentElement.clientWidth||0;
  const h=window.innerHeight||document.documentElement.clientHeight||0;
  const touch=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
  let layout='mobile';
  if(w>=1180 && !touch) layout='desktop';
  else if(w>=760) layout='tablet';
  else layout='mobile';
  const orientation=w>=h?'landscape':'portrait';
  document.body.dataset.layout=layout;
  document.body.dataset.orientation=orientation;
  const name=layout==='desktop'?'PC 화면':layout==='tablet'?(orientation==='landscape'?'iPad 가로':'iPad 세로'):'모바일 화면';
  const el=document.getElementById('heroDevice');
  if(el) el.textContent=name+' 자동 적용';
}
window.addEventListener('resize',applyResponsiveLayout,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(applyResponsiveLayout,200),{passive:true});
applyResponsiveLayout();

autoReset();render();switchTab(localStorage.getItem('benefit-manager-active-tab')||'dashboard');updateAppPanel();setTimeout(()=>checkGithubLatest(true),1200);setTimeout(()=>checkAppUpdate(false),1800);
