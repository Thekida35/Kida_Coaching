/* Kida : adaptateurs qui remplacent les connecteurs Claude par l'API de l'app. */
(function(){
function API(path,opt){opt=opt||{};return fetch(path,{method:opt.method||"GET",body:opt.body,signal:opt.signal,credentials:"same-origin",headers:{"Content-Type":"application/json"}}).then(function(r){
  if(r.status===401){location.href="/login";throw {code:"revoked"}}
  return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw {code:j.error||"unavailable",status:r.status};return j})})}
window.KidaAPI=API;
var cache=null,subs=[],started=false;
function snap(id,d){return {id:id,exists:!!d,data:function(){return d},metadata:{fromCache:false,hasPendingWrites:false}}}
function refresh(){return API("/api/store").then(function(j){cache=j;subs.slice().forEach(function(s){try{s.fn()}catch(e){console.error(e)}})}).catch(function(e){subs.slice().forEach(function(s){if(s.err&&!cache)s.err(e)})})}
function sub(fn,err){var s={fn:fn,err:err};subs.push(s);
  if(!started){started=true;refresh();setInterval(refresh,60000);document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh()})}
  else if(cache)setTimeout(fn,0);
  return function(){subs=subs.filter(function(x){return x!==s})}}
function docApi(path){var p=path.split("/"),base="/api/store/"+p[0]+"/"+p[1];return {
  onSnapshot:function(next,err){return sub(function(){var d=p[0]==="profile"?cache.me:(cache.races.filter(function(r){return r.id===p[1]})[0]||null);if(d){d=Object.assign({},d);delete d.id}next(snap(p[1],d))},err)},
  update:function(patch){return API(base,{method:"PATCH",body:JSON.stringify(patch)}).then(refresh)},
  set:function(data){return API(base,{method:"PUT",body:JSON.stringify(data)}).then(refresh)},
  "delete":function(){return API(base,{method:"DELETE"}).then(refresh)}}}
var db={doc:docApi,collection:function(c){return {doc:function(id){return docApi(c+"/"+id)},onSnapshot:function(next,err){return sub(function(){
  var docs=cache.races.map(function(r){var d=Object.assign({},r),id=d.id;delete d.id;return snap(id,d)});
  next({docs:docs,size:docs.length,empty:!docs.length,docChanges:function(){return []},metadata:{}})},err)}}}};
function route(s,t,i){i=i||{};var q=i.queryParams||{};
  if(s==="AccuWeather"&&t==="widgets-daily-claude")return "/api/weather?key="+encodeURIComponent(q.locationKey||"");
  if(s==="AccuWeather"&&t==="widgets-search-claude")return "/api/geocode?q="+encodeURIComponent(q.query||"");
  if(s==="Strava"&&t==="list_activities"){var u="/api/strava/activities?first="+(i.first||10);if(i.range_start)u+="&range_start="+encodeURIComponent(i.range_start);if(i.range_end)u+="&range_end="+encodeURIComponent(i.range_end);return u}
  if(s==="Strava"&&t==="get_gear")return "/api/strava/gear";
  return null}
function merr(e){return {code:e&&(e.code==="server_not_connected"||e.code==="revoked")?e.code:"server_unavailable",message:""}}
var mcp={callTool:function(s,t,i){var u=route(s,t,i);if(!u)return Promise.reject({code:"not_in_manifest"});return API(u).then(function(j){return {content:[],payload:j}},function(e){throw merr(e)})},
  watchTool:function(s,t,i,h,o){var u=route(s,t,i),dead=false;if(!u){setTimeout(function(){h({type:"error",error:{code:"not_in_manifest"}})});return function(){}}
    function run(){API(u).then(function(j){if(!dead)h({type:"data",result:{content:[],payload:j}})},function(e){if(!dead)h({type:"error",error:merr(e)})})}
    setTimeout(run,0);var iv=o&&o.refetchInterval?setInterval(run,Math.max(30000,o.refetchInterval)):null;
    return function(){dead=true;if(iv)clearInterval(iv)}}};
function sample(input,opts){opts=opts||{};var msgs=typeof input==="string"?[{role:"user",content:input}]:input;
  return API("/api/ai",{method:"POST",body:JSON.stringify({messages:msgs,json:!!opts._json}),signal:opts.signal}).then(function(j){
    if(opts.onText)opts.onText({text:j.text,delta:j.text});return {text:j.text,truncated:!!j.truncated,modelTierApplied:"default"}},
    function(e){if(e&&e.name==="AbortError")throw {code:"cancelled",message:""};throw {code:(e&&e.code)||"upstream_error",message:""}})}
sample.json=function(input,opts){return sample(input,Object.assign({},opts,{_json:true,onText:null})).then(function(r){var t=r.text;try{return JSON.parse(t)}catch(e){var m=t.match(/[\{\[][\s\S]*[\}\]]/);if(m){try{return JSON.parse(m[0])}catch(e2){}}throw {code:"invalid_json",text:t}}})};
window.claude={use:function(n){return Promise.resolve(n==="db"?db:n==="mcp"?mcp:n==="sample"?sample:null)}};
if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});
})();
