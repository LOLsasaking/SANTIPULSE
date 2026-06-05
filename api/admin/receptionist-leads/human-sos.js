import { requireUser } from '../../_lib/auth.js';
import { method, body, send, nowIso } from '../../_lib/adminHttp.js';
import { insertRow } from '../../_lib/adminDb.js';
export default async function handler(req,res){ const user=await requireUser(req,res); if(!user)return; if(!method(req,res,['POST']))return; const input=await body(req); const {row,error}=await insertRow('admin_human_sos_alerts',{owner_id:user.id,severity:input.severity||'normal',message:input.message||'Human escalation requested',status:'open',created_at:nowIso()}); if(error)return send(res,500,{error:error.message}); send(res,201,{alert:row,message:'Human SOS alert logged inside the admin backend.'}); }
