/* Kida — VDOT, Strava, import de résultat, génération de fiche, push, réglages, cloche. Scripts classiques chargés dans l'ordre (voir app.html) : ils partagent la portée globale. */
/* ── VDOT (Daniels) ── */
function vdot(km,s){if(!km||!s)return null;var t=s/60,v=km*1000/t;
  var pct=0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t);
  var vo=-4.6+0.182258*v+0.000104*v*v;return vo/pct}
function timeFor(vd,km){var lo=km*120,hi=km*900;for(var i=0;i<60;i++){var m=(lo+hi)/2;if(vdot(km,m)>vd)lo=m;else hi=m}return (lo+hi)/2}
function progPoints(){return past().filter(function(r){return r.result&&r.result.s&&r.distanceKm>=3}).map(function(r){
  var steep=r.dplus&&r.distanceKm&&r.dplus/r.distanceKm>8;return {r:r,v:vdot(r.distanceKm,r.result.s),steep:steep}}).filter(function(p){return p.v}).sort(function(a,b){return a.r.date<b.r.date?-1:1})}
function vProg(){var P=progPoints();if(P.length<2)return "";
  var road=P.filter(function(p){return !p.steep}),best=road.length?road.reduce(function(a,b){return b.v>a.v?b:a}):null,n=upcoming()[0],h="";
  h+='<h3>Progression entre courses</h3><div class="cc vd"><svg id="vdc" viewBox="0 0 320 170" role="img" aria-label="Niveau VDOT par course"></svg><div class="tip" id="vtip" hidden></div>'+
    '<div class="lg"><span><i></i>route</span><span><i class="o"></i>trail, cross ou ultra (dénivelé, sous-estime ton niveau)</span></div></div>';
  if(best){h+='<div class="why">Le VDOT ramène chaque chrono à un niveau commun, quelle que soit la distance. Ton meilleur niveau sur route : <b>'+best.v.toFixed(1).replace(".",",")+'</b> ('+esc(best.r.name)+').';
    if(n&&n.distanceKm&&goalT(n)){var need=vdot(n.distanceKm,goalT(n));h+=' Ton objectif '+esc(n.goalSel||"B")+' au '+esc(n.name)+' demande <b>'+need.toFixed(1).replace(".",",")+'</b>'+(need>best.v?", soit +"+(need-best.v).toFixed(1).replace(".",",")+" : c'est un vrai palier.":", déjà atteint en course.")}
    h+='</div>'}
  h+='<div class="lc tw" style="padding:6px 18px;margin-top:11px"><table><tr><th>Course</th><th>Chrono</th><th>VDOT</th></tr>'+P.slice().reverse().map(function(p){return '<tr><td>'+esc(p.r.name)+(p.steep?' <span class="dm">· D+</span>':'')+'</td><td>'+hms(p.r.result.s)+'</td><td>'+p.v.toFixed(1).replace(".",",")+'</td></tr>'}).join("")+'</table></div>';
  return h}
function drawProg(){var el=$("vdc");if(!el)return;var P=progPoints(),W=320,H=170,L=34,Rr=12,T=16,B=26;
  var vs=P.map(function(p){return p.v}),lo=Math.floor(Math.min.apply(0,vs)-2),hi=Math.ceil(Math.max.apply(0,vs)+2);
  var t0=pd(P[0].r.date).getTime(),t1=pd(P[P.length-1].r.date).getTime()||t0+1;
  var x=function(p){return L+(pd(p.r.date).getTime()-t0)/((t1-t0)||1)*(W-L-Rr)},y=function(v){return T+(hi-v)/(hi-lo)*(H-T-B)};
  var g="",step=Math.max(2,Math.round((hi-lo)/4));
  for(var v=Math.ceil(lo/step)*step;v<=hi;v+=step)g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(L-6)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10.5" font-weight="600" fill="var(--dim)" font-family="Urbanist,sans-serif">'+v+'</text>';
  var road=P.filter(function(p){return !p.steep}),d=road.map(function(p,i){return (i?"L":"M")+x(p)+" "+y(p.v)}).join(" ");
  var marks=P.map(function(p,i){return '<circle data-i="'+i+'" cx="'+x(p)+'" cy="'+y(p.v)+'" r="5" fill="'+(p.steep?"var(--card)":"var(--g1)")+'" stroke="'+(p.steep?"var(--g1)":"var(--card)")+'" stroke-width="2"/>'}).join("");
  var hits=P.map(function(p,i){return '<circle class="hit" data-i="'+i+'" cx="'+x(p)+'" cy="'+y(p.v)+'" r="14" fill="transparent" tabindex="0"/>'}).join("");
  var labs='<text x="'+x(P[0])+'" y="'+(H-6)+'" font-size="10.5" font-weight="600" fill="var(--dim)" font-family="Urbanist,sans-serif">'+fdate(P[0].r.date)+' '+String(pd(P[0].r.date).getFullYear()).slice(2)+'</text>'+
    '<text x="'+(W-Rr)+'" y="'+(H-6)+'" text-anchor="end" font-size="10.5" font-weight="600" fill="var(--dim)" font-family="Urbanist,sans-serif">'+fdate(P[P.length-1].r.date)+' '+String(pd(P[P.length-1].r.date).getFullYear()).slice(2)+'</text>';
  el.innerHTML=g+(road.length>1?'<path d="'+d+'" fill="none" stroke="var(--g1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>':"")+marks+labs+hits;
  var tip=$("vtip");function show(e){var i=+e.target.dataset.i,p=P[i],box=el.getBoundingClientRect();
    tip.innerHTML=esc(p.r.name)+'<br>'+hms(p.r.result.s)+' · VDOT '+p.v.toFixed(1).replace(".",",");tip.hidden=false;
    tip.style.left=(x(p)/W*box.width)+"px";tip.style.top=(y(p.v)/H*box.height)+"px"}
  el.querySelectorAll(".hit").forEach(function(c){c.onmouseenter=show;c.onfocus=show;c.onclick=show;c.onmouseleave=function(){tip.hidden=true};c.onblur=function(){tip.hidden=true}})}

/* ── Strava en direct ── */
function stravaMsg(c){return c==="server_not_connected"?"Connecte Strava : touche la cloche en haut à droite, puis « Connecter ».":"Strava ne répond pas pour le moment."}
function pl(res){var p=res&&res.payload;if(typeof p==="string"){try{p=JSON.parse(p)}catch(e){p=null}}return p}
var DENY=["needs_reauth","server_not_connected","blocked_by_policy","approval_required","not_in_manifest"];
function stamp(res){var st=res.cache&&res.cache.storedAt,t=st?new Date(st):new Date();return String(t.getHours()).padStart(2,"0")+"h"+String(t.getMinutes()).padStart(2,"0")}
function watchStrava(){if(!S.mcp||S.stOn)return;S.stOn=true;
  S.mcp.watchTool("Strava","list_activities",{first:10},function(ev){
    if(ev.type==="data"){var p=pl(ev.result);S.acts={list:(p&&p.activities)||[],at:stamp(ev.result)}}
    else{var c=ev.error&&ev.error.code;if(DENY.indexOf(c)>=0||!S.acts||!S.acts.list)S.acts={msg:stravaMsg(c)}}
    if(S.view==="forme")render()},{refetchInterval:900000});
  S.mcp.watchTool("Strava","get_gear",{gear_types:["Shoe"]},function(ev){
    if(ev.type==="data"){var p=pl(ev.result);S.gear={list:((p&&p.gear)||[]).filter(function(g){return !g.retired}),at:stamp(ev.result)}}
    else{var c=ev.error&&ev.error.code;if(DENY.indexOf(c)>=0||!S.gear||!S.gear.list)S.gear={msg:stravaMsg(c)}}
    if(S.view==="forme")render()},{refetchInterval:3600000});
}
function vActs(){var A=S.acts;if(!A)return "";
  var h='<h3>Dernières séances<span class="live'+(A.list?"":" off")+'">'+(A.list?"Strava · "+A.at:"hors ligne")+'</span></h3>';
  if(!A.list)return h+'<div class="empty">'+esc(A.msg)+'</div>';
  var runs=A.list.filter(function(a){return /Run/.test(a.sport_type||"")}).slice(0,7);
  return h+'<div class="lc">'+runs.map(function(a){var m=a.summary||{},d=String(a.start_local||"").slice(0,10);
    return '<div class="r"><span class="l">'+(d?fdate(d):"")+' · '+esc(a.name)+'</span><span class="v">'+(m.distance?pace(m.moving_time,m.distance/1000):"—")+'<u>'+(m.distance?(m.distance/1000).toFixed(1).replace(".",",")+" km":"")+(m.relative_effort!=null?" · eff "+m.relative_effort:"")+'</u></span></div>'}).join("")+'</div>'}
function shoeLimit(g){return /alphafly|vaporfly|carbon|metaspeed|adios pro/i.test((g.brand||"")+" "+(g.model_name||""))?400:800}
function vGear(){var G=S.gear;if(!G)return "";
  var h='<h3>Chaussures<span class="live'+(G.list?"":" off")+'">'+(G.list?"Strava · "+G.at:"hors ligne")+'</span></h3>';
  if(!G.list)return h+'<div class="empty">'+esc(G.msg)+'</div>';
  var L=G.list.slice().sort(function(a,b){return b.total_distance-a.total_distance});
  return h+'<div class="lc">'+L.map(function(g){var km=g.total_distance/1000,lim=shoeLimit(g),r=km/lim,
      pill=r>=1?'<span class="pill crit">⚠ à remplacer</span>':r>=.8?'<span class="pill warn2">! à surveiller</span>':"";
    return '<div class="shoe"><div class="top1"><span class="n">'+esc((g.brand||"")+" "+(g.model_name||"").trim())+pill+'</span><span class="km">'+Math.round(km)+'<u>/ '+lim+' km</u></span></div><div class="meter"><i style="width:'+Math.min(100,r*100).toFixed(0)+'%;'+(r>=1?"background:var(--red)":r>=.8?"background:var(--amb)":"")+'"></i></div></div>'}).join("")+'</div>'+
    '<div class="why">Repères d\'usure : 400 km pour les chaussures à plaque carbone, 800 km pour les autres. Au-delà, l\'amorti baisse et le risque de blessure monte.</div>'}

/* ── import du résultat depuis Strava ── */
function importSheet(){var r=race(S.raceId);if(!r||!S.mcp)return;var L=$("layer");
  L.innerHTML='<div class="sheet-bg"><div class="sheet"><h2>Résultat depuis Strava</h2><div class="empty" id="imp">Recherche de tes activités du '+fdate(r.date,true)+'…</div><div class="row2" style="margin-top:12px"><button type="button" class="btn soft" id="icl">Annuler</button><button type="button" class="btn" id="iok" disabled>Importer</button></div></div></div>';
  $("icl").onclick=function(){L.innerHTML=""};
  S.mcp.callTool("Strava","list_activities",{range_start:r.date+"T00:00:00",range_end:r.date+"T23:59:59",first:10,include_tags:true}).then(function(res){
    var p=pl(res),A=((p&&p.activities)||[]).filter(function(a){return /Run/.test(a.sport_type||"")});
    if(!A.length){$("imp").textContent="Aucune course à pied trouvée sur Strava ce jour-là. Saisis le résultat à la main.";return}
    A.sort(function(a,b){var ta=(a.activity_tags||[]).indexOf("Race")>=0?0:1,tb=(b.activity_tags||[]).indexOf("Race")>=0?0:1;if(ta!==tb)return ta-tb;
      var k=(r.distanceKm||0)*1000;return Math.abs(a.summary.distance-k)-Math.abs(b.summary.distance-k)});
    var a=A[0],m=a.summary;
    $("imp").innerHTML='<b>'+esc(a.name)+'</b><br>'+(m.distance/1000).toFixed(2).replace(".",",")+' km · '+hms(m.elapsed_time)+' ('+pace(m.elapsed_time,m.distance/1000)+'/km)'+((a.activity_tags||[]).indexOf("Race")>=0?' · marquée « course »':'')+'<br><span class="dm">Chrono = temps écoulé Strava. Corrige-le ensuite avec ton temps officiel si besoin.</span>';
    var ok=$("iok");ok.disabled=false;ok.onclick=function(){var result=Object.assign({},r.result,{s:m.elapsed_time,strava:a.description||"",stravaId:String(a.id)});
      r.result=result;r.status="done";L.innerHTML="";render();write(r.id,{result:result,status:"done"});toast("Résultat importé")};
  }).catch(function(e){$("imp").textContent=stravaMsg(e&&e.code)});
}

/* ── génération de fiche par le coach ── */
function genPrompt(r){var f=(S.me||{}).forme||{},rec=((S.me||{}).records||[]).filter(function(x){return x.s}).map(function(x){return x.k+" "+(x.label||hms(x.s))}).join(", ");
  var start=addDays(r.date,-13);if(start<todayKey())start=todayKey();
  return "Tu es entraîneur de course à pied. Prépare la fiche complète de la course de Killian. Réponds UNIQUEMENT par un objet JSON.\n\n"+
  "Course : "+r.name+", le "+r.date+(r.time?" à "+r.time:"")+", "+(r.distanceKm||"?")+" km, D+ "+(r.dplus||0)+" m, lieu : "+(r.place||"?")+", priorité "+(r.priority||"B")+".\n"+
  "Objectif chrono B : "+(goalT(r)?hms(goalT(r)):"à proposer")+".\nRecords : "+rec+".\nForme ("+(f.asOf||"?")+") : condition "+f.condition+", fatigue "+f.fatigue+", fraîcheur "+f.tsb+". Seuil ~3:44/km, FC max 196, zones FC Z2 126-156, Z3 157-172, Z4 173-187.\n"+
  "Contraintes : militaire (footing régimentaire fréquents le matin, gardes possibles), gêne ischio droit par le passé, Achille à ménager (pas de sprints), 1-2 jours de repos par semaine, affûtage adapté à la distance. Domicile : Saint-Aubin-du-Cormier (35), déplacement en voiture.\n\n"+
  "Schéma JSON attendu :\n{\"goals\":[{\"k\":\"A\",\"s\":secondes},{\"k\":\"B\",\"s\":secondes},{\"k\":\"C\",\"s\":secondes}],"+
  "\"racePlan\":[{\"km\":\"Km 1\",\"seg\":\"start|mid|end\",\"tag\":\"repère court (FC…)\",\"text\":\"consigne\"}] (3 à 5 portions),\"racePlanNote\":\"…\","+
  "\"plan\":[{\"date\":\"AAAA-MM-JJ\",\"title\":\"…\",\"detail\":\"allures, durée\",\"why\":\"une phrase\"}] (un jour par date, du "+start+" au "+r.date+" inclus),\"planNote\":\"…\","+
  "\"day\":[{\"h\":\"HH:MM\",\"w\":\"action\",\"small\":\"détail\",\"key\":true|false}],\"eve\":[{\"h\":\"…\",\"w\":\"…\",\"small\":\"…\"}],"+
  "\"bag\":[\"objet\"],\"dayInfo\":[{\"l\":\"repère\",\"v\":\"valeur\"}],\"dayNote\":[\"titre court.\",\"phrase\"]}\n"+
  "Tout en français. Les secondes sont des entiers. N'invente pas de détails sur le parcours que tu ne connais pas."}
function genFiche(){var r=race(S.raceId);if(!r||!S.sample)return;var btn=document.querySelector("[data-gen]");if(btn){btn.disabled=true;btn.textContent="Le coach prépare la fiche… (jusqu'à une minute)"}
  S.sample.json(genPrompt(r),{cache:false}).then(function(j){
    if(!j||typeof j!=="object")throw {code:"invalid_json"};
    var patch={},arr=function(k){return Array.isArray(j[k])&&j[k].length};
    if(arr("goals")&&j.goals.every(function(g){return g&&g.k&&+g.s>0}))patch.goals=j.goals.map(function(g){return {k:String(g.k),s:Math.round(+g.s)}});
    if(arr("plan"))patch.plan=j.plan.filter(function(p){return p&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.title}).map(function(p){return {date:p.date,title:String(p.title),detail:String(p.detail||""),why:String(p.why||"")}});
    ["racePlan","day","eve","dayInfo"].forEach(function(k){if(arr(k))patch[k]=j[k]});
    if(arr("bag"))patch.bag=j.bag.map(String);
    ["racePlanNote","planNote"].forEach(function(k){if(typeof j[k]==="string")patch[k]=j[k]});
    if(Array.isArray(j.dayNote)&&j.dayNote.length===2)patch.dayNote=j.dayNote.map(String);
    if(!Object.keys(patch).length)throw {code:"invalid_json"};
    if(!r.goalSel)patch.goalSel="B";patch.generated=todayKey();
    Object.assign(r,patch);render();write(r.id,patch);toast("Fiche générée");
  }).catch(function(e){var c=e&&e.code;toast(c==="sampling_disabled"?"Le coach n'est pas configuré sur le serveur.":c==="rate_limited"?"Trop de demandes : réessaie dans quelques minutes.":"La génération a échoué, réessaie.");render()})}
function genBtn(r){return S.sample&&r.status!=="done"&&days(r.date)>=0?'<button class="btn w" data-gen="1" style="margin-top:0;margin-bottom:4px">'+((r.plan||[]).length?"Regénérer la fiche":"Générer la fiche complète")+'</button>':""}

async function pushState(){try{if(!("serviceWorker" in navigator)||!("PushManager" in window))return "unsupported";var r=await navigator.serviceWorker.ready;return (await r.pushManager.getSubscription())?"on":"off"}catch(e){return "unsupported"}}
async function enablePush(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window)){toast(isStandalone()?"Ton iPhone ne gère pas les notifications web (iOS 16.4 minimum).":"Ajoute d'abord Kida à l'écran d'accueil, puis ouvre-la depuis l'icône.");return}
  var perm=await Notification.requestPermission();if(perm!=="granted"){toast("Notifications refusées. Tu peux les réactiver dans Réglages → Notifications → Kida.");return}
  var k=await window.KidaAPI("/api/push/key");if(!k.key){toast("Les clés de notification ne sont pas encore configurées sur Vercel.");return}
  var reg=await navigator.serviceWorker.ready;var s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(k.key)});
  await window.KidaAPI("/api/push/subscribe",{method:"POST",body:JSON.stringify(s)});toast("Notifications activées");settingsSheet()}
async function disablePush(){try{var reg=await navigator.serviceWorker.ready,s=await reg.pushManager.getSubscription();if(s){await window.KidaAPI("/api/push/subscribe",{method:"DELETE",body:JSON.stringify({endpoint:s.endpoint})});await s.unsubscribe()}}catch(e){}toast("Brief désactivé");settingsSheet()}
/* ── notifications push ── */
function b64u(s){var p="=".repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/")),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function isStandalone(){return window.navigator.standalone===true||matchMedia("(display-mode: standalone)").matches}
/* ── réglages (avatar) ── */
function timeOpts(sel){var t=[];for(var m=5*60;m<=9*60+30;m+=15)t.push(String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"));if(sel&&t.indexOf(sel)<0){t.push(sel);t.sort()}
  return t.map(function(h){return '<option value="'+h+'"'+(h===sel?" selected":"")+'>'+h.replace(":"," h ")+'</option>'}).join("")}
function sw(id,on){return '<label class="sw"><input type="checkbox" id="'+id+'"'+(on?" checked":"")+'><i></i></label>'}
async function settingsSheet(){var L=$("layer");
  L.innerHTML='<div class="sheet-bg"><div class="sheet"><h2>Réglages</h2><div class="lc" id="setl"><div class="r"><span class="l">Chargement…</span></div></div><div class="row2" style="margin-top:12px"><button type="button" class="btn soft" id="lo">Se déconnecter</button><button type="button" class="btn" id="sc">Fermer</button></div></div></div>';
  $("sc").onclick=function(){L.innerHTML=""};L.querySelector(".sheet-bg").onclick=function(e){if(e.target===this)L.innerHTML=""};
  $("lo").onclick=function(){window.KidaAPI("/api/logout",{method:"POST"}).finally(function(){location.href="/login"})};
  var got=await Promise.all([window.KidaAPI("/api/strava/status").catch(function(){return {}}),window.KidaAPI("/api/prefs").catch(function(){return null}),pushState()]);
  var st=got[0],pf=got[1]||{briefTime:"06:45",notify:{brief:true,veille:true,bilan:true,analyse:true}},ps=got[2],el=$("setl");if(!el)return;S.prefs=pf;
  var small=function(t){return '<br><small class="dm" style="font-size:12.5px">'+t+'</small>'},mini='style="min-height:40px;padding:9px 14px"',soft='style="min-height:40px;padding:9px 14px;background:var(--soft)"';
  el.innerHTML='<div class="r"><span class="l">Strava</span><span class="v s">'+(st.connected?'<span class="g">Connecté'+(st.athlete?' · '+esc(st.athlete):'')+'</span>':st.configured?'<a class="btn" '+mini.slice(0,-1)+';text-decoration:none" href="/api/strava/connect">Connecter</a>':'<span class="dm">Codes Strava absents sur Vercel</span>')+'</span></div>'+
    '<div class="r"><span class="l">Notifications'+small("sur cet iPhone")+'</span><span class="v s">'+(ps==="on"?'<button class="btn soft" '+soft+' id="pt">Tester</button> <button class="btn soft" '+soft+' id="pd">Couper</button>':ps==="off"?'<button class="btn" '+mini+' id="pe">Activer</button>':'<span class="dm">'+(isStandalone()?"Non prises en charge":"Ouvre Kida depuis l'écran d'accueil")+'</span>')+'</span></div>'+
    '<div class="r"><span class="l">Brief du matin'+small("10 jours avant une course")+'</span><span class="v s"><select class="tsel" id="bt">'+timeOpts(pf.briefTime)+'</select>'+sw("nb",pf.notify.brief)+'</span></div>'+
    '<div class="r"><span class="l">Veille de séance clé'+small("la veille à 20 h")+'</span><span class="v s">'+sw("nv",pf.notify.veille)+'</span></div>'+
    '<div class="r"><span class="l">Bilan de course'+small("le soir de la course, 20 h 30")+'</span><span class="v s">'+sw("nl",pf.notify.bilan)+'</span></div>'+
    '<div class="r"><span class="l">Analyse de mes sorties'+small("dès qu'une course arrive sur Strava")+'</span><span class="v s">'+sw("na",pf.notify.analyse!==false)+'</span></div>'+
    '<div class="r"><span class="l">Code d\'accès</span><span class="v s"><button class="btn soft" '+soft+' id="cc">Changer</button></span></div>'+
    '<form class="codef" id="codef" hidden><input id="c1" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Code actuel" maxlength="6"><input id="c2" type="password" inputmode="numeric" autocomplete="new-password" placeholder="Nouveau code (4 à 6 chiffres)" maxlength="6"><button class="btn" '+mini+'>Enregistrer</button></form>';
  var save=function(patch,msg){window.KidaAPI("/api/prefs",{method:"PUT",body:JSON.stringify(patch)}).then(function(p){S.prefs=p;toast(msg)}).catch(function(){toast("Échec, réessaie")})};
  $("bt").onchange=function(){save({briefTime:this.value},"Brief à "+this.value.replace(":"," h "))};
  [["nb","brief","Brief du matin"],["nv","veille","Veille de séance clé"],["nl","bilan","Bilan de course"],["na","analyse","Analyse des sorties"]].forEach(function(x){$(x[0]).onchange=function(){var n={};n[x[1]]=this.checked;save({notify:n},x[2]+(this.checked?" activé":" coupé"))}});
  $("cc").onclick=function(){var f=$("codef");f.hidden=!f.hidden;if(!f.hidden)$("c1").focus()};
  $("codef").onsubmit=function(e){e.preventDefault();var a=$("c1").value.trim(),b=$("c2").value.trim();if(!/^\d{4,6}$/.test(b)){toast("Le nouveau code doit faire 4 à 6 chiffres");return}
    fetch("/api/code",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({current:a,next:b})}).then(function(r){return r.json().then(function(j){if(!r.ok)throw j;toast("Code changé");$("codef").hidden=true;$("c1").value=$("c2").value=""})}).catch(function(j){toast((j&&j.error)||"Échec, réessaie")})};
  if($("pe"))$("pe").onclick=enablePush;if($("pd"))$("pd").onclick=disablePush;
  if($("pt"))$("pt").onclick=function(){window.KidaAPI("/api/push/test",{method:"POST"}).then(function(r){toast(r.sent?"Notification envoyée":"Aucun appareil n'a reçu la notification");refreshDot()}).catch(function(){toast("Échec de l'envoi")})};
}

/* ── notifications reçues (cloche) ── */
function ago(t){var s=(Date.now()-t)/1e3;if(s<3600)return "il y a "+Math.max(1,Math.round(s/60))+" min";if(s<86400)return "il y a "+Math.round(s/3600)+" h";var d=new Date(t);return DW[d.getDay()]+" "+d.getDate()+" "+MO[d.getMonth()]}
function refreshDot(){window.KidaAPI("/api/inbox").then(function(j){S.inbox=j;$("bell").classList.toggle("has",j.unseen>0)}).catch(function(){})}
function inboxSheet(){var L=$("layer"),draw=function(j){var it=(j&&j.items)||[];
    return it.length?'<div class="inbox">'+it.map(function(n){return '<div class="nt"><div class="nh"><b>'+esc(n.title)+'</b><span>'+ago(n.t)+'</span><button class="nx" data-del="'+esc(n.id)+'" aria-label="Supprimer">×</button></div><p>'+esc(n.body)+'</p></div>'}).join("")+'</div>'
      :'<div class="empty" style="margin:6px 0 0">Rien pour l\'instant. Ton brief du matin et tes rappels arriveront ici.</div>'};
  L.innerHTML='<div class="sheet-bg"><div class="sheet"><h2>Notifications</h2><div id="inb">'+draw(S.inbox)+'</div><div class="row2" style="margin-top:12px"><button type="button" class="btn soft" id="ia">Tout effacer</button><button type="button" class="btn" id="ic">Fermer</button></div></div></div>';
  $("ic").onclick=function(){L.innerHTML=""};L.querySelector(".sheet-bg").onclick=function(e){if(e.target===this)L.innerHTML=""};
  var show=function(j){S.inbox=j;var b=$("inb");if(!b)return;b.innerHTML=draw(j);var it=(j&&j.items)||[];$("ia").hidden=!it.length;
    b.querySelectorAll("[data-del]").forEach(function(x){x.onclick=function(){x.closest(".nt").remove();window.KidaAPI("/api/inbox?id="+encodeURIComponent(x.dataset.del),{method:"DELETE"}).then(show).catch(function(){toast("Échec, réessaie")})}})};
  $("ia").hidden=!((S.inbox&&S.inbox.items)||[]).length;
  $("ia").onclick=function(){if(!confirm("Effacer toutes les notifications ?"))return;window.KidaAPI("/api/inbox",{method:"DELETE"}).then(show).catch(function(){toast("Échec, réessaie")})};
  window.KidaAPI("/api/inbox").then(function(j){show(j);return window.KidaAPI("/api/inbox",{method:"POST"})}).then(function(){$("bell").classList.remove("has");if(S.inbox)S.inbox.unseen=0}).catch(function(){})}
(function(){var q=new URLSearchParams(location.search).get("strava");if(!q)return;history.replaceState(null,"","/");
  setTimeout(function(){toast(q==="ok"?"Strava connecté":q==="config"?"Il manque les codes Strava sur Vercel":"Connexion Strava annulée")},600)})();
