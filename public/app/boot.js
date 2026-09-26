/* Kida — interactions et démarrage (chargé en dernier). Scripts classiques chargés dans l'ordre (voir app.html) : ils partagent la portée globale. */
addEventListener("resize",fitChat);if(window.visualViewport)visualViewport.addEventListener("resize",fitChat);
document.getElementById("bell").onclick=inboxSheet;document.getElementById("me").onclick=settingsSheet;
setTimeout(refreshDot,300);document.addEventListener("visibilitychange",function(){if(!document.hidden)refreshDot()});
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",function(e){if(e.data&&e.data.type==="push"){refreshDot();if(!S.cctl){S.chat=null;if(S.view==="coach")loadChat()}}});

/* ── interactions ── */
function bind(){
  document.querySelectorAll("[data-race]").forEach(function(b){b.onclick=function(){go("race",b.dataset.race)}});
  document.querySelectorAll("[data-nav]").forEach(function(b){b.onclick=function(){go(b.dataset.nav)}});
  document.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){S.tab=b.dataset.tab;render()}});
  document.querySelectorAll("[data-add]").forEach(function(b){b.onclick=addSheet});
  document.querySelectorAll("[data-result]").forEach(function(b){b.onclick=resultSheet});
  document.querySelectorAll("[data-coach]").forEach(function(b){b.onclick=function(){var id=S.raceId;go("coach");S.coachRace=id}});
  document.querySelectorAll("[data-notes]").forEach(function(b){b.onclick=notesSheet});
  document.querySelectorAll("[data-newchat]").forEach(function(b){b.onclick=newChat});
  var cf=$("cform");if(cf){var cq=$("cq"),grow=function(){cq.style.height="auto";cq.style.height=Math.min(cq.scrollHeight,140)+"px"};
    cq.value=S.draft||"";grow();cq.oninput=function(){S.draft=cq.value;grow();fitChat()};
    cf.onsubmit=function(e){e.preventDefault();if(S.cctl){S.cctl.abort();return}var q=cq.value.trim();if(q){S.draft="";askCoach(q)}}}
  document.querySelectorAll("[data-day]").forEach(function(b){b.onclick=function(){S.dayIdx=+b.dataset.day;render()}});
  document.querySelectorAll("[data-dayd]").forEach(function(b){b.onclick=function(){var n=upcoming()[0];(n.plan||[]).forEach(function(q,i){if(q.date===b.dataset.dayd)S.dayIdx=i});render();scrollTo({top:0,behavior:"smooth"})}});
  document.querySelectorAll("[data-goplan]").forEach(function(b){b.onclick=function(){go("race",b.dataset.goplan,"plan")}});
  document.querySelectorAll("[data-done]").forEach(function(b){b.onclick=function(){var n=upcoming()[0];if(!n)return;var i=b.dataset.done;
    n.checks=Object.assign({},n.checks);n.checks.tap=Object.assign({},n.checks.tap);n.checks.tap[i]=!n.checks.tap[i];
    var patch={checks:{tap:{}}};patch.checks.tap[i]=n.checks.tap[i];render();write(n.id,patch);if(n.checks.tap[i])toast("Bien joué, séance cochée")}});
  document.querySelectorAll("[data-import]").forEach(function(b){b.onclick=importSheet});
  document.querySelectorAll("[data-gen]").forEach(function(b){b.onclick=genFiche});
  if(S.view==="forme"){watchStrava();drawProg()}
  if(S.view==="race"){var rr=race(S.raceId);if(rr)watchWx(rr)}
  document.querySelectorAll("[data-goal]").forEach(function(b){b.onclick=function(){var r=race(S.raceId);if(!r)return;r.goalSel=b.dataset.goal;render();write(r.id,{goalSel:r.goalSel})}});
  document.querySelectorAll(".ci[data-ck],.pd[data-ck]").forEach(function(c){
    var t=function(){var r=race(S.raceId);if(!r)return;var g=c.dataset.ck,i=c.dataset.i;r.checks=Object.assign({},r.checks);r.checks[g]=Object.assign({},r.checks[g]);
      r.checks[g][i]=!r.checks[g][i];var patch={checks:{}};patch.checks[g]={};patch.checks[g][i]=r.checks[g][i];render();write(r.id,patch)};
    c.onclick=t;c.onkeydown=function(e){if(e.key===" "||e.key==="Enter"){e.preventDefault();t()}}});
  drawSeuil();
}
var pending=Promise.resolve();
function write(id,patch){pending=pending.then(function(){return S.db.doc("races/"+id).update(patch)}).catch(function(e){toast(e&&e.code==="invalid_argument"?"Modification refusée : tu n'as pas les droits d'écriture.":"Échec de l'enregistrement, réessaie.")})}

function sheet(html,onOk){var L=$("layer");L.innerHTML='<div class="sheet-bg"><form class="sheet" id="sf" novalidate>'+html+'<p class="err" id="serr"></p><div class="row2" style="margin-top:12px"><button type="button" class="btn soft" id="scancel">Annuler</button><button type="submit" class="btn" id="sok">Enregistrer</button></div></form></div>';
  $("scancel").onclick=function(){L.innerHTML=""};
  L.querySelector(".sheet-bg").onclick=function(e){if(e.target===this)L.innerHTML=""};
  $("sf").onsubmit=function(e){e.preventDefault();var msg=onOk();if(msg){$("serr").textContent=msg;return}L.innerHTML=""};
  var f=L.querySelector("input");if(f)f.focus()}
function fld(id,label,type,val,ph){return '<label class="fld"><span>'+label+'</span><input id="'+id+'" type="'+type+'" value="'+esc(val||"")+'" placeholder="'+esc(ph||"")+'"></label>'}
function slug(s){return (s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"course").slice(0,40)}

function addSheet(){
  sheet('<h2>Nouvelle course</h2>'+fld("f-name","Nom","text","","Semi de Vannes")+
    '<div class="row2">'+fld("f-date","Date","date","")+fld("f-time","Heure de départ","time","")+'</div>'+
    '<div class="row2">'+fld("f-km","Distance (km)","number","","21.1")+fld("f-dp","D+ (m)","number","","")+'</div>'+
    fld("f-place","Lieu","text","","Vannes")+
    '<div class="row2"><label class="fld"><span>Priorité</span><select id="f-pr"><option value="A">A · objectif</option><option value="B" selected>B · préparation</option><option value="C">C · plaisir</option></select></label>'+
    fld("f-goal","Objectif chrono","text","","1:20:00")+'</div>',
  function(){var name=$("f-name").value.trim(),date=$("f-date").value,kmv=parseFloat(String($("f-km").value).replace(",",".")),g=parseT($("f-goal").value);
    if(!name)return "Donne un nom à la course.";if(!date)return "Choisis la date de la course.";
    if($("f-km").value&&!(kmv>0))return "La distance doit être un nombre de kilomètres, par exemple 21.1.";
    if(isNaN(g))return "Écris le chrono au format h:mm:ss ou mm:ss, par exemple 1:20:00.";
    var id=slug(name)+"-"+date.slice(0,4),doc={id:id,name:name,date:date,time:$("f-time").value||"",distanceKm:kmv||null,dplus:+$("f-dp").value||null,
      place:$("f-place").value.trim(),priority:$("f-pr").value,status:"upcoming",goalSel:"B",
      goals:g?[{k:"A",s:Math.round(g*0.99)},{k:"B",s:g},{k:"C",s:Math.round(g*1.015)}]:[],checks:{}};
    var place=doc.place;
    (S.mcp&&place?S.mcp.callTool("AccuWeather","widgets-search-claude",{queryParams:{query:place}}).then(function(res){var p=res&&res.payload;if(typeof p==="string"){try{p=JSON.parse(p)}catch(e){p=null}}
      var k=p&&p.results&&p.results[0]&&p.results[0].locationKey;if(k)doc.weather={locationKey:String(k)}}).catch(function(){}):Promise.resolve())
    .then(function(){return S.db.doc("races/"+id).set(doc)}).then(function(){toast("Course ajoutée");go("race",id)}).catch(function(e){toast(e&&e.code==="quota_exceeded"?"La base est pleine : supprime des courses anciennes.":"Échec de l'ajout, réessaie.")});
    return ""});
}
function resultSheet(){var r=race(S.raceId);if(!r)return;var res=r.result||{};
  sheet('<h2>Résultat · '+esc(r.name)+'</h2>'+
    '<div class="row2">'+fld("r-t","Chrono","text",res.s?hms(res.s):"","37:02")+fld("r-p","Classement","text",res.place||"","112e / 3 400")+'</div>'+
    fld("r-hr","FC moyenne","number",res.avgHr||"","")+
    '<label class="fld"><span>Bilan</span><textarea id="r-b" rows="4" placeholder="Ce qui a marché, ce qui a coincé">'+esc(r.bilan||"")+'</textarea></label>',
  function(){var t=parseT($("r-t").value);if(!t||isNaN(t))return "Écris le chrono au format h:mm:ss ou mm:ss, par exemple 37:02.";
    var result=Object.assign({},res,{s:t,place:$("r-p").value.trim(),avgHr:+$("r-hr").value||null});
    r.result=result;r.bilan=$("r-b").value.trim();r.status="done";render();
    write(r.id,{result:result,bilan:r.bilan,status:"done"});toast("Résultat enregistré");return ""});
}

/* ── data ── */
/* Lien direct vers un onglet (ex. notification « Analyse prête » → /?v=coach). */
var DEEP=new URLSearchParams(location.search).get("v");if(DEEP)history.replaceState(null,"","/");
(async function(){
  var db=null;try{db=await window.claude.use("db")}catch(e){}
  if(!db){S.failed=true;render();return}
  S.db=db;var got=0;
  window.claude.use("mcp").then(function(m){S.mcp=m;if(m&&S.ok)render()}).catch(function(){});
  window.claude.use("sample").then(function(sm){S.sample=sm;if(sm&&S.ok)render()}).catch(function(){});
  function ready(){if(++got>=2&&!S.ok){S.ok=true;if(/^(coach|races|forme)$/.test(DEEP||""))return go(DEEP)}if(S.ok)render()}
  db.collection("races").onSnapshot(function(q){S.races=q.docs.map(function(d){var x=Object.assign({},d.data());x.id=d.id;return x});if(S.ok)render();else ready()},function(){S.failed=true;render()});
  db.doc("profile/me").onSnapshot(function(d){S.me=d.exists?d.data():null;if(S.ok)render();else ready()},function(){if(!S.ok)ready()});
})();
