const $=id=>document.getElementById(id);
async function refresh(){
 try{
  const s=await window.officerlabAI.state();
  $("status").textContent=s.status==="connected"?(s.sharing?"Connected · ChatGPT plan usage enabled":"Connected · plan usage not enabled"):"Not connected";
  $("status").className=s.sharing?"ok":"warn";
  $("account").textContent=s.identity?.email||s.profileLabel||"";
  $("eligibility").textContent=s.sharing?"OpenAI granted the required plan-usage permission.": "Your current connection does not have the required plan-usage permission. Check your plan eligibility and authorization settings.";
  $("disconnect").disabled=s.status!=="connected";
  if(s.sharing) await loadModels();
 }catch(e){$("status").textContent=e.message;}
}
async function loadModels(){
 try{const models=await window.officerlabAI.models();$("model").innerHTML="";for(const m of models){const o=document.createElement("option");o.value=m.slug;o.textContent=m.name;$("model").append(o);}}
 catch(e){$("eligibility").textContent=e.message;}
}
$("signin").onclick=async()=>{ $("status").textContent="Opening secure ChatGPT sign-in…";try{await window.officerlabAI.signIn();await refresh();}catch(e){$("status").textContent=e.message;}};
$("disconnect").onclick=async()=>{try{await window.officerlabAI.disconnect();$("output").textContent="";await refresh();}catch(e){$("status").textContent=e.message;}};
$("usage").onclick=()=>window.officerlabAI.usage();
$("ask").onclick=async()=>{const prompt=$("prompt").value,model=$("model").value;if(!model){$("output").textContent="No authorized model available.";return;}$("output").textContent="Generating…";$("ask").disabled=true;try{const r=await window.officerlabAI.ask(prompt,model);$("output").textContent=r.text;}catch(e){$("output").textContent=e.message;}finally{$("ask").disabled=false;}};
refresh();