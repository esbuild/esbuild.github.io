function F(e,o,n){let t=e.trimStart(),a=/^{|^\/[*/]/.test(t),i;if(!t)return n&&(n.innerHTML=""),{};if(a)i=He(e);else{let s=r=>{if(i[r]!==void 0)try{i[r]=new RegExp(i[r]+"")}catch(c){throw r=r.replace(/[A-Z]/g,g=>"-"+g.toLowerCase()),new Error(`Invalid regular expression for "--${r}=": ${c.message}`)}},f=r=>{i[r]!==void 0&&(i[r]=(i[r]+"").split(","))};i=Ie(e,o),s("mangleProps"),s("reserveProps"),f("resolveExtensions"),f("mainFields"),f("conditions"),f("target");let l=i.supported;if(typeof l=="object"&&l!==null)for(let r in l)l[r]==="true"?l[r]=!0:l[r]==="false"&&(l[r]=!1);if(i.tsconfigRaw!==void 0)try{i.tsconfigRaw=JSON.parse(i.tsconfigRaw)}catch{}}if(n){let s,f=document.createElement("a");if(f.href="javascript:void 0",n.innerHTML="",a)try{s=Ae(i),f.textContent="Switch to CLI syntax"}catch{}else s=Ne(i),f.textContent="Switch to JS syntax";s!==void 0&&(f.onclick=()=>{let l=n.parentElement.querySelector("textarea");n.innerHTML="",l.value=s,l.dispatchEvent(new Event("input"))},n.append(f))}return i}function Ie(e,o){let n=[],t=e.length,a=0,i=0,s=0;for(;s<t;){let c=s,g=a,d=s-i,p="",u=e[s];if(u===" "||u==="	"||u===`
`){s++,u===`
`&&(a++,i=s);continue}for(;s<t&&(u=e[s],!(u===" "||u==="	"||u===`
`));)if(s++,u==="\\"&&s<t)u=e[s++],u===`
`?(a++,i=s):p+=u;else if(u==="'"){let m=a,S=s-i-1;for(;s===t&&se(e,"'",m,S,a,s-i),u=e[s++],u!=="'";){if(u==="\\"&&s<t&&e[s]!=="'"&&(u=e[s++],u===`
`)){a++,i=s;continue}u===`
`&&(a++,i=s),p+=u}}else if(u==='"'){let m=a,S=s-i-1;for(;s===t&&se(e,'"',m,S,a,s-i),u=e[s++],u!=='"';){if(u==="\\"&&s<t&&(u=e[s++],u===`
`)){a++,i=s;continue}u===`
`&&(a++,i=s),p+=u}}else p+=u;n.push({L:p,E:g,k:d,W:s-c})}let f=[],l=Object.create(null),r=(c,g)=>(c!==c.toLowerCase()&&v(e,"Invalid CLI-style flag: "+JSON.stringify("--"+c),g.E,g.k,c.length+2),c.replace(/-(\w)/g,(d,p)=>p.toUpperCase()));for(let{L:c,...g}of n){let d=c.indexOf("=");if(c.startsWith("--")){let p=c.indexOf(":");if(p>=0&&d<0){let u=r(c.slice(2,p),g),m=c.slice(p+1);(!(u in l)||!Array.isArray(l[u]))&&(l[u]=[]),l[u].push(m)}else if(p>=0&&p<d){let u=r(c.slice(2,p),g),m=c.slice(p+1,d),S=c.slice(d+1);(!(u in l)||typeof l[u]!="object"||Array.isArray(l[u]))&&(l[u]=Object.create(null)),l[u][m]=S}else if(d>=0){let u=c.slice(d+1);l[r(c.slice(2,d),g)]=u==="true"?!0:u==="false"?!1:u}else l[r(c.slice(2),g)]=!0}else c.startsWith("-")||o===0?v(e,'All CLI-style flags must start with "--"',g.E,g.k,g.W):(l.entryPoints=f,f.push(d<0?c:{in:c.slice(d+1),out:c.slice(0,d)}))}return f.length&&(l.entryPoints=f),l}function He(e){let o=()=>{let d=c.v===10?"string":(c.v===8?"identifier ":"")+JSON.stringify(c.L);return v(e,`Unexpected ${d} in ${i}`,c.E,c.k,c.L.length)},n=(d,p,u)=>v(e,`Expected "${p}" after ${u} in ${i}`,d.E,d.k+d.L.length,0,"",0,0,0,p),t=(d=!1)=>{for(;r<s;){let p=f,u=r-l,m=e[r];if(m===`
`){f++,l=++r;continue}if(m===" "||m==="	"){r++;continue}if(m==="/"){let M=r++;if(r<s&&e[r]==="/"){for(r++;r<s&&e[r]!==`
`;)r++;continue}if(r<s&&e[r]==="*"){for(r++;;)if(r===s&&v(e,'Expected "*/" to terminate multi-line comment',f,r-l,0,"The multi-line comment starts here:",p,u,2,"*/"),m=e[r++],m===`
`)f++,l=r;else if(m==="*"&&r<s&&e[r]==="/"){r++;break}continue}let h=0;for(;(r===s||e[r]===`
`)&&(h?v(e,'Expected "]" to terminate character class',f,r-l,0,"The character class starts here:",f,h-l,1,"]"):v(e,'Expected "/" to terminate regular expression',f,r-l,0,"The regular expression starts here:",p,u,1,"/")),m=e[r++],!(m==="/"&&!h);)m==="]"&&h?h=0:m==="["?h=r-1:m==="\\"&&r<s&&e[r]!==`
`&&r++;for(;r<s&&/\w/.test(e[r]);)r++;let E=e.slice(M,r),x;try{x=(0,eval)(E)}catch{v(e,`Invalid regular expression in ${i}`,p,u,r-M)}c={E:p,k:u,v:9,L:E,R:x};return}d&&v(e,`Expected end of file after ${i}`,f,r-l,0);let S="-,:[]{}+".indexOf(m);if(S>=0){r++,c={E:p,k:u,v:S,L:m,R:m};return}if(m==="."||m>="0"&&m<="9"){let M=/^[\.\w]$/,h=r++;for(;r<s&&M.test(e[r]);)r++;let E=e.slice(h,r);if(!/\d/.test(E))r=h;else{let x=+E;x!==x&&v(e,`Invalid number "${E}" in ${i}`,p,u,r-h),c={E:p,k:u,v:9,L:E,R:x};return}}let ve=/^[\w\$]$/;if(ve.test(m)){let M=r++;for(;r<s&&ve.test(e[r]);)r++;let h=e.slice(M,r),E=9,x=h;h==="null"?x=null:h==="true"?x=!0:h==="false"?x=!1:h==="undefined"?x=void 0:h==="Infinity"?x=1/0:h==="NaN"?x=NaN:E=8,c={E:p,k:u,v:E,L:h,R:x};return}if(m==='"'||m==="'"){let M=r++;for(;;)if((r===s||e[r]===`
`)&&se(e,m,p,u,f,r-l),e[r]==="\\"&&r+1<s)r+=2,e[r-1]===`
`&&(f++,l=r);else if(e[r++]===m)break;let h=e.slice(M,r),E;try{E=(0,eval)(h)}catch{v(e,`Invalid string in ${i}`,p,u,r-M)}c={E:p,k:u,v:10,L:h,R:E};return}v(e,`Unexpected ${JSON.stringify(m)} in ${i}`,f,r-l,1)}d||v(e,`Unexpected end of file in ${i}`,f,r-l,0)},a=()=>{if(c.v===5){let d=Object.create(null),p=Object.create(null);for(;t(),c.v!==6;){c.v!==10&&c.v!==8&&o();let u=p[c.R];u&&v(e,`Duplicate key ${JSON.stringify(c.R)} in object literal`,c.E,c.k,c.L.length,`The original key ${JSON.stringify(c.R)} is here:`,u.E,u.k,u.L.length);let m=c;t(),c.v!==2&&n(m,":","property "+JSON.stringify(m.R)),t(),d[m.R]=a(),p[m.R]=m;let S=c;if(t(),c.v===6)break;c.v!==1&&n(S,",","property "+JSON.stringify(m.R))}return d}if(c.v===3){let d=[],p=0;for(;t(),c.v!==4;)if(c.v!==1){d[p++]=a();let u=c;if(t(),c.v===4)break;c.v!==1&&n(u,",","array element")}else d.length=++p;return d}return c.v===9||c.v===10?c.R:c.v===7?(t(),+a()):c.v===0?(t(),-a()):o()},i="JSON5 value",s=e.length,f=0,l=0,r=0,c;t();let g=a();return t(!0),g}function v(e,o,n,t,a,i="",s=0,f=0,l=0,r){let c=e.split(`
`),g=new Error(o);throw g.J={re:"<options>",E:n+1,k:t,W:a,se:c[n],ie:r},i&&(g.le=[{L:i,J:{re:"<options>",E:s+1,k:f,W:l,se:c[s]}}]),g}function se(e,o,n,t,a,i){let s=o==='"'?"double":"single";v(e,`Failed to find the closing ${s} quote`,a,i,0,`The opening ${s} quote is here:`,n,t,1,o)}function Ae(e){let o=a=>/[ \t\n\\'"]/.test(a)?'"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"':a,n=a=>a.replace(/[A-Z]/g,i=>"-"+i.toLowerCase()),t=[];for(let a in e){let i=n(a),s=e[a],f=typeof s;if(f==="string"||f==="boolean"||f==="number"||s===null)t.push(s===!0?"--"+i:`--${i}=${s}`);else if(Array.isArray(s))if(a==="resolveExtensions"||a==="mainFields"||a==="conditions"||a==="target")t.push(`--${i}=${s}`);else for(let l of s)t.push(a==="entryPoints"?typeof l=="object"&&l!==null&&typeof l.in=="string"&&typeof l.out=="string"?`${l.out}=${l.in}`:l:`--${i}:${l}`);else if(s instanceof RegExp)t.push(`--${i}=${s.source}`);else if(a==="tsconfigRaw")t.push(`--${i}=${JSON.stringify(s)}`);else if(f==="object"&&a!=="mangleCache"&&a!=="stdin")for(let l in s)t.push(`--${i}:${l}=${s[l]}`);else throw new Error("Not representable")}return t.map(o).join(" ")}function Ne(e){let o=(n,t,a=!0)=>{let i=typeof n;if(i==="string"){let l=n.replace(/\\/g,"\\\\").replace(/\n/g,"\\n"),r=l.split("'"),c=l.split('"');return c.length<r.length?'"'+c.join('\\"')+'"':"'"+r.join("\\'")+"'"}if(i==="boolean"||i==="number"||n instanceof RegExp)return n+"";let s=t+"  ";if(Array.isArray(n)){let l=n.every(c=>typeof c=="string"),r="[";for(let c of n)r+=r==="["?l?"":`
`+s:l?", ":s,r+=o(c,s,!1),l||(r+=`,
`);return r!=="["&&!l&&(r+=t),r+"]"}let f="{";for(let l in n){let r=n[l];f+=f==="{"?a?`
`+s:" ":a?s:", ",f+=`${/^[A-Za-z$_][A-Za-z0-9$_]*$/.test(l)?l:o(l,"")}: ${o(r,s)}`,a&&(f+=`,
`)}return f!=="{"&&(f+=a?t:" "),f+"}"};return o(e,"")}function P(e){let o=document.createElement("a");return o.className="underLink",o.href="javascript:void 0",o.target="_blank",o.textContent="Visualize this source map",o.onclick=()=>{let[n,t]=e(),a=`${n.length}\0${n}${t.length}\0${t}`;o.href="https://evanw.github.io/source-map-visualization/#"+btoa(a),setTimeout(()=>o.href="javascript:void 0")},o}function je(e){let o=/\/(\/)[#@] *sourceMappingURL=([^\s]+)/.exec(e);return o||(o=/\/(\*)[#@] *sourceMappingURL=((?:[^\s*]|\*[^/])+)(?:[^*]|\*[^/])*\*\//.exec(e)),o&&o[2]}function C(e,o,n){let t=je(o);if(n&&n.remove(),t&&t.startsWith("data:application/json;base64,")){let a;try{a=JSON.parse(atob(t.slice(29)))}catch{}a&&typeof a=="object"&&(n=P(()=>[o,JSON.stringify(a)]),e.append(n))}return n}var L=document.getElementById("outputResult"),V=document.createElement("textarea"),le=document.createElement("textarea"),Z=document.createElement("textarea"),ce=document.createElement("textarea"),K=document.createElement("textarea"),ie=[],I,ae=!1;$(V,!0);$(le,!0);$(Z,!0);$(ce,!0);$(K,!0);function y(e){document.body.style.paddingBottom=e.clientHeight+"px",e.style.height="0",e.style.height=e.scrollHeight+1+"px",document.body.style.paddingBottom="0"}function $(e,o=!1){e.readOnly=o,e.spellcheck=!1,e.autocapitalize="off",e.autocomplete="off"}function G(e){let o=`\x1B[31m\u2718 \x1B[41;31m[\x1B[41;97mERROR\x1B[41;31m]\x1B[0m \x1B[1m${e&&e.message||e}\x1B[0m`,n=e&&e.J,t=e&&e.le;if(n&&(o+=xe(n)),t)for(let a of t)o+=`
  ${a.L}`,a.J&&(o+=xe(a.J));return o}function xe({re:e,E:o,k:n,W:t,se:a,ie:i}){let f=a.length,l=t<2?"^":"~".repeat(t),r=`

    ${e}:${o}:${n}:
`;if(f>80){let c=Math.max(0,Math.min(n*2+t-80>>1,n-16,f-80)),g=a.slice(c,c+80);n=Math.max(0,n-c),t=Math.min(t,g.length-n),g.length>3&&c>0&&(g="..."+g.slice(3),n=Math.max(n,3)),g.length>3&&c+80<f&&(g=g.slice(0,g.length-3)+"...",t=Math.max(0,Math.min(t,g.length-3-n))),a=g}return r+=`\x1B[37m${o.toString().padStart(7)} \u2502 ${a.slice(0,n)}\x1B[32m${a.slice(n,n+t)}\x1B[37m${a.slice(n+t)}
`,i&&(r+=`        \u2502 ${" ".repeat(n)}\x1B[32m${l}\x1B[37m
`,l=i),r+=`        \u2575 ${" ".repeat(n)}\x1B[32m${l}\x1B[0m
`,r}function H(e,o,n){if(n!==void 0){let t=document.createElement("div");return e.textContent=n.replace(/\n$/,""),t.id=o,t.className="hasLabel",t.append(e),L.append(t),y(e),t}}function ue({ae:e,ce:o,K:n,ue:t,A:a}){if(L.innerHTML="",H(V,"transformOutput",e),o?(H(K,"sourceMap",o),I&&I.remove(),I=P(()=>[e||"",JSON.stringify(JSON.parse(o))]),K.parentElement.append(I)):I=C(V.parentElement,e||"",I),n&&H(Z,"transformMangleCache",JSON.stringify(n,null,2)),H(le,"legalComments",t),a){let i=document.createElement("div");i.id="stderrLog",i.innerHTML=Ee(a),L.append(i)}if(e===void 0&&!a){let i=document.createElement("div");i.id="outputStatus",i.textContent="(no output)",L.append(i)}}function fe({fe:e,de:o,K:n,A:t},a){if(L.innerHTML="",ie.length=0,e){e.sort((i,s)=>+(i.path>s.path)-+(i.path<s.path));for(let i of e){let s=document.createElement("div"),f=document.createElement("div"),l=document.createElement("textarea");if(f.className="outputPath",f.textContent=i.path.replace(/^\//,""),l.readOnly=!0,l.value=i.text.replace(/\n$/,""),$(l),s.className="buildOutput hasLabel",s.append(l),i.path.endsWith(".map")){for(let r of e)if(i.path===r.path+".map"){s.append(P(()=>[r.text,JSON.stringify(JSON.parse(i.text))]));break}}else C(s,i.text,void 0);L.append(f,s),ie.push(l),y(l)}}if(t){let i=document.createElement("div");i.id="stderrLog",i.innerHTML=Ee(t),L.append(i)}if((!e||!e.length)&&!t){let i=document.createElement("div");i.id="outputStatus",i.textContent=a?"(no output)":"(no entry points)",L.append(i)}if(n&&H(Z,"mangleCache",JSON.stringify(n,null,2)),o){let i=H(ce,"metafile",JSON.stringify(o,null,2)),s=document.createElement("a");s.className="underLink",s.href="javascript:void 0",s.target="_blank",s.textContent="Analyze this metafile",s.onclick=()=>{s.href="/analyze/#"+btoa(JSON.stringify(o)),setTimeout(()=>s.href="javascript:void 0")},i.append(s)}}function J(e){e&&(ae=!1),!ae&&(L.innerHTML=`<span id="outputStatus">Loading${e?" version "+e:""}...</span>`)}function be(e){ae=!0,L.innerHTML="";let o=document.createElement("div");o.className="problem",o.innerHTML=`\u274C Failed to load esbuild: ${e}`,L.append(o)}function Ee(e){return"<span>"+e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\033\[([^m]*)m/g,(o,n)=>{switch(n){case"1":return'</span><span class="color-bold">';case"31":return'</span><span class="color-red">';case"32":return'</span><span class="color-green">';case"33":return'</span><span class="color-yellow">';case"35":return'</span><span class="color-magenta">';case"37":return'</span><span class="color-dim">';case"41;31":return'</span><span class="bg-red color-red">';case"41;97":return'</span><span class="bg-red color-white">';case"43;33":return'</span><span class="bg-yellow color-yellow">';case"43;30":return'</span><span class="bg-yellow color-black">';case"0":return"</span><span>"}throw new Error(`Unknown escape sequence: ${n}`)})+"</span>"}addEventListener("resize",()=>{if(k===0)y(V),y(K),y(le);else{for(let e of ie)y(e);y(ce)}y(Z)});var R=document.querySelector("#transformOptions textarea"),Je=document.querySelector("#transformOptions .underLink"),O=document.querySelector("#transformInput textarea"),Te;function Le(){return[R.value,O.value]}function ke(e,o){(R.value!==e||O.value!==o)&&(R.value=e,O.value=o,q()),W()}function W(){y(R),y(O)}function q(){let e=O.value;Q(),Te=C(O.parentElement,e,Te);try{X({G:"transform",X:e,H:F(R.value,0,Je)}).then(o=>{ue(o)},()=>{})}catch(o){ue({A:G(o)})}}R.oninput=()=>{y(R),q()};O.oninput=()=>{y(O),q()};addEventListener("resize",W);W();var Se=We(),b=document.querySelector("#versionPicker select"),Y=document.createElement("option"),_;Y.textContent="Loading...";b.append(Y);b.disabled=!0;Se.then(e=>{let o=e.filter(n=>!/^0\.[0-4]\.|^0\.5\.0/.test(n));b.disabled=!1,Y.remove();for(let n of o){let t=document.createElement("option");t.textContent=n,b.append(t)}b.onchange=()=>_(b.value),b.selectedIndex=-1},()=>{Y.textContent="\u274C Loading failed!"});function we(){return b.disabled||b.selectedIndex<0?null:b.value}function de(e){_=e}async function U(e){if(e===null)b.selectedIndex!==-1&&(b.selectedIndex=-1,await _(null));else{let o=await Se,n=e==="latest"&&o.length?0:o.indexOf(e);n>=0&&b.selectedIndex!==n&&(b.selectedIndex=n,await _(o[n]))}}async function We(){let e=new AbortController,o=setTimeout(()=>e.abort("Timeout"),5e3);try{let n="https://data.jsdelivr.com/v1/package/npm/esbuild-wasm",t=await fetch(n,{signal:e.signal});if(t&&t.ok){clearTimeout(o);let a=(await t.json()).versions;if(a&&a.length)return console.log(`Loaded ${a.length} versions from ${n}`),a}}catch(n){console.error(n)}try{let n="https://registry.npmjs.org/esbuild-wasm",t=(await fetch(n).then(a=>a.json())).versions;if(t&&(t=Object.keys(t).reverse(),t.length))return console.log(`Loaded ${t.length} versions from ${n}`),t}catch(n){console.error(n)}throw new Error}function Me(){let e=location.hash,o=atob(e.slice(1)).split("\0");if(o[0]==="t"&&o.length===4)return D(0),ke(o[2],o[3]),U(o[1]),!0;if(o[0]==="b"&&o.length%3===0){let n=[];for(let t=3;t<o.length;t+=3)n.push({Z:o[t]==="e",Y:o[t+1],N:o[t+2]});return D(1),$e(o[2],n),U(o[1]),!0}if(location.hash!=="")try{history.replaceState({},"",location.pathname)}catch{}return!1}function Q(){let e=we();if(!e)return;let o;if(k===0){let[t,a]=Le();(t||a)&&(o=["t",e,t,a])}else{let[t,a]=pe();o=["b",e,t];for(let i of a)o.push(i.Z?"e":"",i.Y,i.N)}let n=location.pathname+location.search;try{let t=o?"#"+btoa(o.join("\0")).replace(/=+$/,""):"";location.hash!==t&&history.replaceState({},"",t||n)}catch{if(location.hash!=="")try{history.replaceState({},"",n)}catch{}}}var N=document.querySelector("#buildOptions textarea"),qe=document.querySelector("#buildOptions .underLink"),me=document.getElementById("addInput"),Ue=document.getElementById("buildInputs"),T=[];function pe(){return[N.value,T.map(e=>({Z:e.j.classList.contains("entryPoint"),Y:e.U.value.trim(),N:e.D.value}))]}function $e(e,o){if(JSON.stringify([e,o])!==JSON.stringify(pe())){for(let n of T)n.j.remove();T.length=0,N.value=e;for(let n of o)he(n.Z,n.Y,n.N);A(),w()}ee()}function Be(){T.length||he(!0,ge())}function ee(){y(N);for(let e of T)y(e.D)}function w(){Q();try{let e=F(N.value,1,qe),o=Array.isArray(e.entryPoints)?e.entryPoints:e.entryPoints=[],n=Object.create(null),t=Object.create(null),a;for(let i of T){let s=i.U.value.trim();if((t[s]||(t[s]=[])).push(i),s)n[s]=i.D.value,i.j.classList.contains("entryPoint")&&!o.includes(s)&&o.push(s);else{let l=e.stdin&&typeof e.stdin=="object"?e.stdin:e.stdin={};l.contents=i.D.value,"resolveDir"in l||(l.resolveDir="/")}}for(let i in t){let s=t[i];if(s.length>1){for(let f of s)f.j.classList.add("duplicate");a||(a=new Error("Duplicate input file: "+(i?JSON.stringify(i):"<stdin>")))}else s[0].j.classList.remove("duplicate")}if(a)throw a;X({G:"build",X:n,H:e}).then(i=>{fe(i,o.length)},()=>{})}catch(e){fe({A:G(e)},-1)}}function ge(){if(!T.length)return"entry.js";let e=1,o="file.js";for(;T.some(n=>n.U.value.trim()===o);)o=`file${++e}.js`;return o}function A(){me.textContent="+ "+ge()}function he(e=!1,o="",n=""){let t=()=>{let d=f.value;if(d.endsWith(".map")){let p;try{p=JSON.parse(r.value)}catch{}if(p&&typeof p=="object"){g=P(()=>{let u="";for(let m of T)if(d===m.U.value+".map"){u=m.D.value;break}return[u,JSON.stringify(p)]}),a.append(g);return}}g=C(a,r.value,g)},a=document.createElement("div"),i=document.createElement("a"),s=document.createElement("a"),f=document.createElement("input"),l=document.createElement("div"),r=document.createElement("textarea"),c={j:a,U:f,D:r},g;return $(f),$(r),f.placeholder="<stdin>",f.value=o,i.className="entryToggle",i.textContent="",i.href="javascript:void 0",s.className="remove",s.textContent="\xD7",s.href="javascript:void 0",r.placeholder="(enter your code here)",r.value=n,a.className="buildInput",e&&a.classList.add("entryPoint"),l.className="hasLabel",l.append(r),a.append(i,f,s,l),Ue.insertBefore(a,me),f.oninput=()=>{t(),A(),w()},f.onblur=()=>{let d=f.value.trim();f.value!==d&&(f.value=d,A(),w())},r.oninput=()=>{t(),y(r),w()},i.onclick=()=>{a.classList.toggle("entryPoint"),w()},s.onclick=()=>{let d=T.indexOf(c);d<0||(T.splice(d,1),a.remove(),A(),w())},T.push(c),t(),A(),y(r),c}N.oninput=()=>{y(N),w()};me.onclick=()=>{let e=he(!T.length,ge());e.U.focus(),e.U.select(),w()};addEventListener("resize",ee);A();var k=0,Oe=[document.getElementById("transformPanel"),document.getElementById("buildPanel")],De=document.getElementById("modeSwitcher"),te=De.querySelectorAll("a");te[0].onclick=()=>{D(0)&&(J(null),ne())};te[1].onclick=()=>{Be(),D(1)&&(J(null),ne())};function D(e){return k===e?!1:(te[k].classList.remove("active"),Oe[k].style.display="none",k=e,te[k].classList.add("active"),Oe[k].style.display="block",!0)}function ne(){k===0?(W(),q()):(ee(),w())}var Pe=new URLSearchParams(location.search),ye=Pe.get("polywasm"),oe=Pe.get("pkgurl"),Fe=fetch("worker.js").then(e=>e.text()),j=null,B=null,re=new Promise((e,o)=>{de(n=>{let t=Re(n);return t.then(e,o),de(a=>(re.then(i=>i.terminate()),re=Re(a),re)),t})});async function Ce(e){let o=new AbortController,n=setTimeout(()=>o.abort("Timeout"),5e3);try{let t=await fetch(`https://cdn.jsdelivr.net/npm/${e}`,{signal:o.signal});if(t.ok)return clearTimeout(n),t}catch(t){console.error(t)}return fetch(`https://unpkg.com/${e}`)}async function Re(e){let o,n,t;J(e);try{if(j&&j.ee(),B&&B.ee(),j=null,B=null,e===null)n=fetch(new URL("lib/browser.min.js",oe)),t=fetch(new URL("esbuild.wasm",oe));else{let[g,d,p]=e.split(".").map(m=>+m),u=g===0&&(d<8||d===8&&p<33)?"":".min";n=Ce(`esbuild-wasm@${e}/lib/browser${u}.js`),t=Ce(`esbuild-wasm@${e}/esbuild.wasm`)}let a=g=>g.then(d=>{if(!d.ok)throw`${d.status} ${d.statusText}: ${d.url}`;return d}),i=ye==="0"||ye==="1"?ye:null,[s,f,l]=await Promise.all([Fe,a(n).then(g=>g.text()),a(t).then(g=>g.arrayBuffer())]),r=[f,`
var polywasm=${i};`,s],c=URL.createObjectURL(new Blob(r,{type:"application/javascript"}));return await new Promise((g,d)=>{let p=new Worker(c);p.onmessage=u=>{if(u.data.q==="slow"){let m=document.getElementById("slowWarning");m.innerHTML="<span>\u26A0\uFE0F Processing is slow because </span><span>WebAssembly is disabled \u26A0\uFE0F</span>",m.style.display="flex";return}p.onmessage=null,u.data.q==="success"?(g(p),ne()):(d(new Error("Failed to create worker")),o=u.data.me),URL.revokeObjectURL(c)},p.postMessage([e,l],[l])})}catch(a){throw be(o||a+""),a}}function X(e){function o(n,t){j?(B&&B.ee(),B=t):(j=t,n.onmessage=a=>{n.onmessage=null,t.pe(a.data),j=null,B&&(o(n,B),B=null)},n.postMessage(t.Fe))}return new Promise((n,t)=>{re.then(a=>o(a,{Fe:e,pe:n,ee:()=>t(new Error("Task aborted"))}),t)})}Me()||U(oe?null:"latest");
