(function(){
'use strict';
var Auth=window.SantiAuth;
var moduleState={
 'receptionist-leads':['integrations','leads','conversations','scheduling'],
 'social-insights-autoposter':['integrations','trends','queue'],
 'auto-ad-manager':['integrations','campaigns','rules','recommendations']
};
function qs(s,r){return(r||document).querySelector(s)}function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function api(path,opts){return Auth.apiFetch('/api/admin/'+path+'/',opts).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'request-failed');return j})})}
function setView(name){qsa('.nav-item').forEach(function(b){b.classList.toggle('active',b.dataset.module===name)});qsa('.module-view').forEach(function(v){v.classList.toggle('active',v.dataset.view===name)});if(location.hash.slice(1)!==name)history.replaceState(null,'','#'+name);loadModule(name)}
function renderStatus(name,data){var grid=qs('[data-status-grid="'+name+'"]');if(!grid)return;var items=(data.integrations||[]).map(function(x){return '<div class="status-card '+(x.configured?'ready':'missing')+'"><span class="label">'+esc(x.provider)+'</span><span class="value">'+(x.configured?'Ready':'Missing env')+'</span><small>'+esc(x.purpose||'Integration endpoint prepared')+'</small></div>'}).join('');grid.innerHTML=items||'<div class="empty-state">No integration status returned.</div>'}
function table(el,rows,cols,empty){var node=typeof el==='string'?qs(el):el;if(!node)return;if(!rows||!rows.length){node.innerHTML='<div class="empty-state">'+esc(empty||'No records yet. Foundation endpoint is ready.')+'</div>';return}node.innerHTML='<table class="data-table"><thead><tr>'+cols.map(function(c){return '<th>'+esc(c.label)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+cols.map(function(c){var val=typeof c.value==='function'?c.value(r):r[c.key];return '<td>'+val+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table>'}
function loadEndpoint(path){return api(path).then(function(data){if(path.indexOf('receptionist-leads/leads')===0)table('#leadsTable',data.leads,[{label:'Name',key:'name'},{label:'Phone',key:'phone'},{label:'Stage',value:function(r){return '<span class="pill ready">'+esc(r.stage||'new')+'</span>'}},{label:'Updated',key:'updated_at'}]);
if(path.indexOf('receptionist-leads/conversations')===0)table('#conversationsTable',data.conversations,[{label:'Channel',key:'channel'},{label:'Contact',key:'contact'},{label:'Summary',key:'summary'},{label:'SOS',value:function(r){return r.human_sos?'<span class="pill hot">SOS</span>':'<span class="pill">No</span>'}}]);
if(path.indexOf('receptionist-leads/scheduling')===0)qs('#schedulingPanel').innerHTML=esc(data.message||'Calendar endpoint ready.');
if(path.indexOf('social-insights-autoposter/trends')===0)table('#trendsTable',data.trends,[{label:'Platform',key:'platform'},{label:'Topic',key:'topic'},{label:'Style',key:'style'},{label:'Score',key:'score'}]);
if(path.indexOf('social-insights-autoposter/queue')===0)table('#queueTable',data.posts,[{label:'Platform',key:'platform'},{label:'Caption',key:'caption'},{label:'Status',key:'status'},{label:'Scheduled',key:'scheduled_for'}]);
if(path.indexOf('auto-ad-manager/campaigns')===0)table('#campaignsTable',data.campaigns,[{label:'Platform',key:'platform'},{label:'Campaign',key:'name'},{label:'Budget',key:'daily_budget'},{label:'Status',key:'status'}]);
if(path.indexOf('auto-ad-manager/rules')===0)table('#rulesTable',data.rules,[{label:'Name',key:'name'},{label:'Metric',key:'metric'},{label:'Operator',key:'operator'},{label:'Action',key:'action'}]);
if(path.indexOf('auto-ad-manager/recommendations')===0)table('#recommendationsTable',data.recommendations,[{label:'Campaign',key:'campaign_name'},{label:'Recommendation',key:'recommendation'},{label:'Confidence',key:'confidence'},{label:'Status',key:'status'}]);
}).catch(function(e){console.error(e)})}
function loadModule(name){var endpoints=moduleState[name]||[];endpoints.forEach(function(e){var p=name+'/'+e;api(p).then(function(d){if(e==='integrations')renderStatus(name,d);else loadEndpoint(p)}).catch(function(err){console.error(err)})})}
function bootstrap(){if(!Auth||!Auth.available()){location.href='/login/';return}Auth.getSession().then(function(session){if(!session){location.href='/login/';return}qs('#adminEmail').textContent=session.user.email||'Authenticated';qs('#loading').classList.add('hidden');qs('#app').classList.remove('hidden');qsa('[data-module]').forEach(function(b){b.addEventListener('click',function(){setView(b.dataset.module)})});qsa('[data-refresh]').forEach(function(b){b.addEventListener('click',function(){loadEndpoint(b.dataset.refresh)})});var sos=qs('[data-action="human-sos"]');if(sos)sos.addEventListener('click',function(){api('receptionist-leads/human-sos',{method:'POST',body:JSON.stringify({severity:'test',message:'Manual dashboard test escalation'})}).then(function(d){qs('#sosPanel').textContent=d.message||'SOS logged.'})});qs('#logoutBtn').addEventListener('click',function(){Auth.signOut().then(function(){location.href='/login/'})});setView(location.hash.slice(1)||'receptionist-leads')})}
bootstrap();
})();
