var Ee=["conditions","dropLabels","mainFields","resolveExtensions","target"];function V(e,r,t){let n=e.trimStart(),a=/^{|^\/[*/]/.test(n),o;if(!n)return t&&(t.innerHTML=""),{};if(a)o=We(e);else{let d=l=>{if(o[l]!==void 0)try{o[l]=new RegExp(o[l]+"")}catch(m){throw l=l.replace(/[A-Z]/g,f=>"-"+f.toLowerCase()),new Error(`Invalid regular expression for "--${l}=": ${m.message}`)}},c=l=>{if(o[l]!==void 0)try{o[l]=+o[l]}catch(m){throw l=l.replace(/[A-Z]/g,f=>"-"+f.toLowerCase()),new Error(`Invalid number for "--${l}=": ${m.message}`)}};o=Fe(e,r),c("logLimit"),c("lineLimit"),d("mangleProps"),d("reserveProps");for(let l of Ee)o[l]!==void 0&&(o[l]=(o[l]+"").split(","));let s=o.supported;if(typeof s=="object"&&s!==null)for(let l in s)s[l]==="true"?s[l]=!0:s[l]==="false"&&(s[l]=!1)}let i=o.tsconfigRaw;if(i!==void 0)try{i=JSON.parse(i)}catch{}return t&&(t.innerHTML="",Je(t,a,o,i,e),Ue(t,a,o,i)),o}function Je(e,r,t,n,a){if(n===void 0&&(n={}),typeof n!="object")return;let o=n.compilerOptions;if(o===void 0&&(o={}),typeof o=="object"&&(t.loader==="ts"||t.loader==="tsx")&&typeof o.experimentalDecorators!="boolean"){let i={...t,tsconfigRaw:{...n,compilerOptions:{...o,experimentalDecorators:!0}}},d;if(r)d=we(i);else if(t.tsconfigRaw===void 0)d=[a,/\n/.test(a)?`
`:" ",se({tsconfigRaw:i.tsconfigRaw})].join("");else try{d=se(i)}catch{}if(d!==void 0){let c=document.createElement("a");c.href="javascript:void 0",c.textContent="Enable TS experimental decorators",c.onclick=()=>{let s=e.parentElement.querySelector("textarea");e.innerHTML="",s.value=d,s.dispatchEvent(new Event("input"))},e.append(c," ")}}}function Ue(e,r,t,n){let a,o=document.createElement("a");if(r)try{a=se(t),o.textContent="Switch to CLI syntax"}catch{}else a=we(n?{...t,tsconfigRaw:n}:t),o.textContent="Switch to JS syntax";a!==void 0&&(o.href="javascript:void 0",o.onclick=()=>{let i=e.parentElement.querySelector("textarea");e.innerHTML="",i.value=a,i.dispatchEvent(new Event("input"))},e.append(o))}function Fe(e,r){let t=[],n=e.length,a=0,o=0,i=0;for(;i<n;){let l=i,m=a,f=i-o,u="",p=e[i];if(p===" "||p==="	"||p===`
`){i++,p===`
`&&(a++,o=i);continue}for(;i<n&&(p=e[i],!(p===" "||p==="	"||p===`
`));)if(i++,p==="\\"&&i<n)p=e[i++],p===`
`?(a++,o=i):u+=p;else if(p==="'"){let g=a,k=i-o-1;for(;i===n&&ie(e,"'",g,k,a,i-o),p=e[i++],p!=="'";){if(p==="\\"&&i<n&&e[i]!=="'"&&(p=e[i++],p===`
`)){a++,o=i;continue}p===`
`&&(a++,o=i),u+=p}}else if(p==='"'){let g=a,k=i-o-1;for(;i===n&&ie(e,'"',g,k,a,i-o),p=e[i++],p!=='"';){if(p==="\\"&&i<n&&(p=e[i++],p===`
`)){a++,o=i;continue}p===`
`&&(a++,o=i),u+=p}}else u+=p;t.push({L:u,E:m,k:f,q:i-l})}let d=[],c=Object.create(null),s=(l,m)=>(l!==l.toLowerCase()&&y(e,"Invalid CLI-style flag: "+JSON.stringify("--"+l),m.E,m.k,l.length+2),l.replace(/-(\w)/g,(f,u)=>u.toUpperCase()));for(let{L:l,...m}of t){let f=l.indexOf("=");if(l.startsWith("--")){let u=l.indexOf(":");if(u>=0&&f<0){let p=s(l.slice(2,u),m),g=l.slice(u+1);(!(p in c)||!Array.isArray(c[p]))&&(c[p]=[]),c[p].push(g)}else if(u>=0&&u<f){let p=s(l.slice(2,u),m),g=l.slice(u+1,f),k=l.slice(f+1);(!(p in c)||typeof c[p]!="object"||Array.isArray(c[p]))&&(c[p]=Object.create(null)),c[p][g]=k}else if(f>=0){let p=l.slice(f+1);c[s(l.slice(2,f),m)]=p==="true"?!0:p==="false"?!1:p}else c[s(l.slice(2),m)]=!0}else l.startsWith("-")||r===0?y(e,'All CLI-style flags must start with "--"',m.E,m.k,m.q):(c.entryPoints=d,d.push(f<0?l:{in:l.slice(f+1),out:l.slice(0,f)}))}return d.length&&(c.entryPoints=d),c}function We(e){let r=()=>{let f=l.v===10?"string":(l.v===8?"identifier ":"")+JSON.stringify(l.L);return y(e,`Unexpected ${f} in ${o}`,l.E,l.k,l.L.length)},t=(f,u,p)=>y(e,`Expected "${u}" after ${p} in ${o}`,f.E,f.k+f.L.length,0,"",0,0,0,u),n=(f=!1)=>{for(;s<i;){let u=d,p=s-c,g=e[s];if(g===`
`){d++,c=++s;continue}if(g===" "||g==="	"){s++;continue}if(g==="/"){let M=s++;if(s<i&&e[s]==="/"){for(s++;s<i&&e[s]!==`
`;)s++;continue}if(s<i&&e[s]==="*"){for(s++;;)if(s===i&&y(e,'Expected "*/" to terminate multi-line comment',d,s-c,0,"The multi-line comment starts here:",u,p,2,"*/"),g=e[s++],g===`
`)d++,c=s;else if(g==="*"&&s<i&&e[s]==="/"){s++;break}continue}let h=0;for(;(s===i||e[s]===`
`)&&(h?y(e,'Expected "]" to terminate character class',d,s-c,0,"The character class starts here:",d,h-c,1,"]"):y(e,'Expected "/" to terminate regular expression',d,s-c,0,"The regular expression starts here:",u,p,1,"/")),g=e[s++],!(g==="/"&&!h);)g==="]"&&h?h=0:g==="["?h=s-1:g==="\\"&&s<i&&e[s]!==`
`&&s++;for(;s<i&&/\w/.test(e[s]);)s++;let E=e.slice(M,s),v;try{v=(0,eval)(E)}catch{y(e,`Invalid regular expression in ${o}`,u,p,s-M)}l={E:u,k:p,v:9,L:E,A:v};return}f&&y(e,`Expected end of file after ${o}`,d,s-c,0);let k="-,:[]{}+".indexOf(g);if(k>=0){s++,l={E:u,k:p,v:k,L:g,A:g};return}if(g==="."||g>="0"&&g<="9"){let M=/^[\.\w]$/,h=s++;for(;s<i&&M.test(e[s]);)s++;let E=e.slice(h,s);if(!/\d/.test(E))s=h;else{let v=+E;v!==v&&y(e,`Invalid number "${E}" in ${o}`,u,p,s-h),l={E:u,k:p,v:9,L:E,A:v};return}}let ke=/^[\w\$]$/;if(ke.test(g)){let M=s++;for(;s<i&&ke.test(e[s]);)s++;let h=e.slice(M,s),E=9,v=h;h==="null"?v=null:h==="true"?v=!0:h==="false"?v=!1:h==="undefined"?v=void 0:h==="Infinity"?v=1/0:h==="NaN"?v=NaN:E=8,l={E:u,k:p,v:E,L:h,A:v};return}if(g==='"'||g==="'"){let M=s++;for(;;)if((s===i||e[s]===`
`)&&ie(e,g,u,p,d,s-c),e[s]==="\\"&&s+1<i)s+=2,e[s-1]===`
`&&(d++,c=s);else if(e[s++]===g)break;let h=e.slice(M,s),E;try{E=(0,eval)(h)}catch{y(e,`Invalid string in ${o}`,u,p,s-M)}l={E:u,k:p,v:10,L:h,A:E};return}y(e,`Unexpected ${JSON.stringify(g)} in ${o}`,d,s-c,1)}f||y(e,`Unexpected end of file in ${o}`,d,s-c,0)},a=()=>{if(l.v===5){let f=Object.create(null),u=Object.create(null);for(;n(),l.v!==6;){l.v!==10&&l.v!==8&&r();let p=u[l.A];p&&y(e,`Duplicate key ${JSON.stringify(l.A)} in object literal`,l.E,l.k,l.L.length,`The original key ${JSON.stringify(l.A)} is here:`,p.E,p.k,p.L.length);let g=l;n(),l.v!==2&&t(g,":","property "+JSON.stringify(g.A)),n(),f[g.A]=a(),u[g.A]=g;let k=l;if(n(),l.v===6)break;l.v!==1&&t(k,",","property "+JSON.stringify(g.A))}return f}if(l.v===3){let f=[],u=0;for(;n(),l.v!==4;)if(l.v!==1){f[u++]=a();let p=l;if(n(),l.v===4)break;l.v!==1&&t(p,",","array element")}else f.length=++u;return f}return l.v===9||l.v===10?l.A:l.v===7?(n(),+a()):l.v===0?(n(),-a()):r()},o="JSON5 value",i=e.length,d=0,c=0,s=0,l;n();let m=a();return n(!0),m}function y(e,r,t,n,a,o="",i=0,d=0,c=0,s){let l=e.split(`
`),m=new Error(r);throw m.V={re:"<options>",E:t+1,k:n,q:a,oe:l[t],ae:s},o&&(m.le=[{L:o,V:{re:"<options>",E:i+1,k:d,q:c,oe:l[i]}}]),m}function ie(e,r,t,n,a,o){let i=r==='"'?"double":"single";y(e,`Failed to find the closing ${i} quote`,a,o,0,`The opening ${i} quote is here:`,t,n,1,r)}function se(e){let r=a=>/[ \t\n\\'"]/.test(a)?'"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"':a,t=a=>a.replace(/[A-Z]/g,o=>"-"+o.toLowerCase()),n=[];for(let a in e){let o=t(a),i=e[a],d=typeof i;if(d==="string"||d==="boolean"||d==="number"||i===null)n.push(i===!0?"--"+o:`--${o}=${i}`);else if(Array.isArray(i))if(Ee.includes(a))n.push(`--${o}=${i}`);else for(let c of i)n.push(a==="entryPoints"?typeof c=="object"&&c!==null&&typeof c.in=="string"&&typeof c.out=="string"?`${c.out}=${c.in}`:c:`--${o}:${c}`);else if(i instanceof RegExp)n.push(`--${o}=${i.source}`);else if(a==="tsconfigRaw")n.push(`--${o}=${JSON.stringify(i)}`);else if(d==="object"&&a!=="mangleCache"&&a!=="stdin")for(let c in i)n.push(`--${o}:${c}=${i[c]}`);else throw new Error("Not representable")}return n.map(r).join(" ")}function we(e){let r=(t,n,a=!0)=>{let o=typeof t;if(o==="string"){let c=t.replace(/\\/g,"\\\\").replace(/\n/g,"\\n"),s=c.split("'"),l=c.split('"');return l.length<s.length?'"'+l.join('\\"')+'"':"'"+s.join("\\'")+"'"}if(o==="boolean"||o==="number"||t instanceof RegExp)return t+"";let i=n+"  ";if(Array.isArray(t)){let c=t.every(l=>typeof l=="string"),s="[";for(let l of t)s+=s==="["?c?"":`
`+i:c?", ":i,s+=r(l,i,!1),c||(s+=`,
`);return s!=="["&&!c&&(s+=n),s+"]"}let d="{";for(let c in t){let s=t[c];d+=d==="{"?a?`
`+i:" ":a?i:", ",d+=`${/^[A-Za-z$_][A-Za-z0-9$_]*$/.test(c)?c:r(c,"")}: ${r(s,i)}`,a&&(d+=`,
`)}return d!=="{"&&(d+=a?n:" "),d+"}"};return r(e,"")}function R(e){let r=document.createElement("a");return r.className="underLink",r.href="javascript:void 0",r.target="_blank",r.textContent="Visualize this source map",r.onclick=()=>{let[t,n]=e(),a=`${t.length}\0${t}${n.length}\0${n}`;r.href="https://evanw.github.io/source-map-visualization/#"+btoa(a),setTimeout(()=>r.href="javascript:void 0")},r}function De(e){let r=/\/(\/)[#@] *sourceMappingURL=([^\s]+)/.exec(e);return r||(r=/\/(\*)[#@] *sourceMappingURL=((?:[^\s*]|\*[^/])+)(?:[^*]|\*[^/])*\*\//.exec(e)),r&&r[2]}function $(e,r,t){let n=De(r);if(t&&t.remove(),n&&n.startsWith("data:application/json;base64,")){let a;try{a=JSON.parse(atob(n.slice(29)))}catch{}a&&typeof a=="object"&&(t=R(()=>[r,JSON.stringify(a)]),e.append(t))}return t}var w=document.getElementById("outputResult"),z=document.createElement("textarea"),ce=document.createElement("textarea"),G=document.createElement("textarea"),pe=document.createElement("textarea"),K=document.createElement("textarea"),ae=[],A,le=!1;C(z,!0);C(ce,!0);C(G,!0);C(pe,!0);C(K,!0);function x(e){document.body.style.paddingBottom=e.clientHeight+"px",e.style.height="0",e.style.height=e.scrollHeight+1+"px",document.body.style.paddingBottom="0"}function C(e,r=!1){e.readOnly=r,e.spellcheck=!1,e.autocapitalize="off",e.autocomplete="off"}function Z(e){let r=`\x1B[31m\u2718 \x1B[41;31m[\x1B[41;97mERROR\x1B[41;31m]\x1B[0m \x1B[1m${e&&e.message||e}\x1B[0m`,t=e&&e.V,n=e&&e.le;if(t&&(r+=Le(t)),n)for(let a of n)r+=`
  ${a.L}`,a.V&&(r+=Le(a.V));return r}function Le({re:e,E:r,k:t,q:n,oe:a,ae:o}){let d=a.length,c=n<2?"^":"~".repeat(n),s=`

    ${e}:${r}:${t}:
`;if(d>80){let l=Math.max(0,Math.min(t*2+n-80>>1,t-16,d-80)),m=a.slice(l,l+80);t=Math.max(0,t-l),n=Math.min(n,m.length-t),m.length>3&&l>0&&(m="..."+m.slice(3),t=Math.max(t,3)),m.length>3&&l+80<d&&(m=m.slice(0,m.length-3)+"...",n=Math.max(0,Math.min(n,m.length-3-t))),a=m}return s+=`\x1B[37m${r.toString().padStart(7)} \u2502 ${a.slice(0,t)}\x1B[32m${a.slice(t,t+n)}\x1B[37m${a.slice(t+n)}
`,o&&(s+=`        \u2502 ${" ".repeat(t)}\x1B[32m${c}\x1B[37m
`,c=o),s+=`        \u2575 ${" ".repeat(t)}\x1B[32m${c}\x1B[0m
`,s}function H(e,r,t){if(t!==void 0){let n=document.createElement("div");return e.textContent=t.replace(/\n$/,""),n.id=r,n.className="hasLabel",n.append(e),w.append(n),x(e),n}}function de({ce:e,ue:r,X:t,de:n,N:a}){if(w.innerHTML="",H(z,"transformOutput",e),r?(H(K,"sourceMap",r),A&&A.remove(),A=R(()=>[e||"",JSON.stringify(JSON.parse(r))]),K.parentElement.append(A)):A=$(z.parentElement,e||"",A),t&&H(G,"transformMangleCache",JSON.stringify(t,null,2)),H(ce,"legalComments",n),a){let o=document.createElement("div");o.id="stderrLog",o.innerHTML=Me(a),w.append(o)}if(e===void 0&&!a){let o=document.createElement("div");o.id="outputStatus",o.textContent="(no output)",w.append(o)}}function ue({fe:e,pe:r,X:t,N:n},a){if(w.innerHTML="",ae.length=0,e){e.sort((o,i)=>+(o.path>i.path)-+(o.path<i.path));for(let o of e){let i=document.createElement("div"),d=document.createElement("div"),c=document.createElement("textarea");if(d.className="outputPath",d.textContent=o.path.replace(/^\//,""),c.readOnly=!0,c.value=o.text.replace(/\n$/,""),C(c),i.className="buildOutput hasLabel",i.append(c),o.path.endsWith(".map")){for(let s of e)if(o.path===s.path+".map"){i.append(R(()=>[s.text,JSON.stringify(JSON.parse(o.text))]));break}}else $(i,o.text,void 0);w.append(d,i),ae.push(c),x(c)}}if(n){let o=document.createElement("div");o.id="stderrLog",o.innerHTML=Me(n),w.append(o)}if((!e||!e.length)&&!n){let o=document.createElement("div");o.id="outputStatus",o.textContent=a?"(no output)":"(no entry points)",w.append(o)}if(t&&H(G,"mangleCache",JSON.stringify(t,null,2)),r){let o=H(pe,"metafile",JSON.stringify(r,null,2)),i=document.createElement("a");i.className="underLink",i.href="javascript:void 0",i.target="_blank",i.textContent="Analyze this metafile",i.onclick=()=>{i.href="/analyze/#"+btoa(JSON.stringify(r)),setTimeout(()=>i.href="javascript:void 0")},o.append(i)}}function J(e){e&&(le=!1),!le&&(w.innerHTML=`<span id="outputStatus">Loading${e?" version "+e:""}...</span>`)}function Se(e){le=!0,w.innerHTML="";let r=document.createElement("div");r.className="problem",r.innerHTML=`\u274C Failed to load esbuild: ${e}`,w.append(r)}function Me(e){return"<span>"+e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\033\[([^m]*)m/g,(r,t)=>{switch(t){case"1":return'</span><span class="color-bold">';case"31":return'</span><span class="color-red">';case"32":return'</span><span class="color-green">';case"33":return'</span><span class="color-yellow">';case"35":return'</span><span class="color-magenta">';case"37":return'</span><span class="color-dim">';case"41;31":return'</span><span class="bg-red color-red">';case"41;97":return'</span><span class="bg-red color-white">';case"43;33":return'</span><span class="bg-yellow color-yellow">';case"43;30":return'</span><span class="bg-yellow color-black">';case"0":return"</span><span>"}throw new Error(`Unknown escape sequence: ${t}`)})+"</span>"}addEventListener("resize",()=>{if(L===0)x(z),x(K),x(ce);else{for(let e of ae)x(e);x(pe)}x(G)});var B=document.querySelector("#transformOptions textarea"),Ve=document.querySelector("#transformOptions .underLink"),O=document.querySelector("#transformInput textarea"),fe=document.querySelector("#transformInput .underLink"),Ce;function Ie(){return[B.value,O.value]}function me(e,r){(B.value!==e||O.value!==r)&&(B.value=e,O.value=r,F()),U()}function U(){x(B),x(O)}function F(){let e=B.value,r=O.value;X(),Ce=$(O.parentElement,r,Ce);try{Y({Z:"transform",Y:r,W:V(e,0,Ve)}).then(t=>{de(t)},()=>{})}catch(t){de({N:Z(t)})}if(fe.innerHTML="",!e&&!r){let t=document.createElement("a");t.href="javascript:void 0",t.textContent="Load an example...",t.onclick=Oe,fe.append(t)}}function Oe(){me(`--target=es6
--loader=tsx
--jsx=automatic
--minify-identifiers
--sourcemap`,`// The "tsx" loader removes type annotations
export type NamesProps = { names?: string[] }

export const NamesComponent = (props: NamesProps) => {
  // The "?." operator will be transformed for ES6
  const names = props.names?.join(' ')

  // The "tsx" loader transforms JSX syntax into JS
  return <div>Names: {names}</div>
}`)}B.oninput=()=>{x(B),F()};O.oninput=()=>{x(O),F()};fe.querySelector("a").onclick=Oe;addEventListener("resize",U);U();var $e=qe(),T=document.querySelector("#versionPicker select"),Q=document.createElement("option"),_;Q.textContent="Loading...";T.append(Q);T.disabled=!0;$e.then(e=>{let r=e.filter(t=>!/^0\.[0-4]\.|^0\.5\.0/.test(t));T.disabled=!1,Q.remove();for(let t of r){let n=document.createElement("option");n.textContent=t,T.append(n)}T.onchange=()=>_(T.value),T.selectedIndex=-1},()=>{Q.textContent="\u274C Loading failed!"});function Be(){return T.disabled?null:T.selectedIndex<0?"pkgurl":T.value}function ge(e){_=e}async function W(e){if(e==="pkgurl")T.selectedIndex!==-1&&(T.selectedIndex=-1,await _("pkgurl"));else{let r=await $e,t=e==="latest"?r.length?0:-1:r.indexOf(e);t>=0&&T.selectedIndex!==t&&(T.selectedIndex=t,await _(r[t]))}}async function qe(){let e=new AbortController,r=setTimeout(()=>e.abort("Timeout"),5e3);try{let t="https://data.jsdelivr.com/v1/package/npm/esbuild-wasm",n=await fetch(t,{signal:e.signal});if(n&&n.ok){clearTimeout(r);let a=(await n.json()).versions;if(a&&a.length)return console.log(`Loaded ${a.length} versions from ${t}`),a}}catch(t){console.error(t)}try{let t="https://registry.npmjs.org/esbuild-wasm",n=(await fetch(t).then(a=>a.json())).versions;if(n&&(n=Object.keys(n).reverse(),n.length))return console.log(`Loaded ${n.length} versions from ${t}`),n}catch(t){console.error(t)}throw new Error}function Pe(){let e=location.hash,r=atob(e.slice(1)).split("\0");if(r[0]==="t"&&r.length===4)return D(0),me(r[2],r[3]),W(r[1]),!0;if(r[0]==="b"&&r.length%3===0){let t=[];for(let n=3;n<r.length;n+=3)t.push({U:r[n]==="e",j:r[n+1],z:r[n+2]});return D(1),xe(r[2],t),W(r[1]),!0}if(location.hash!=="")try{history.replaceState({},"",location.pathname+location.search)}catch{}return!1}function X(){let e=Be();if(!e)return;let r;if(L===0){let[n,a]=Ie();(n||a)&&(r=["t",e,n,a])}else{let[n,a]=he();r=["b",e,n];for(let o of a)r.push(o.U?"e":"",o.j,o.z)}let t=location.pathname+location.search;try{let n=r?"#"+btoa(r.join("\0")).replace(/=+$/,""):"";location.hash!==n&&history.replaceState({},"",n||t)}catch{if(location.hash!=="")try{history.replaceState({},"",t)}catch{}}}var P=document.querySelector("#buildOptions textarea"),ze=document.querySelector("#buildOptions .underLink"),be=document.getElementById("addInput"),Ke=document.getElementById("buildInputs"),b=[];function he(){return[P.value,b.map(e=>({U:e.J.classList.contains("entryPoint"),j:e.H.value.trim(),z:e.D.value}))]}function xe(e,r){if(JSON.stringify([e,r])!==JSON.stringify(he())){for(let t of b)t.J.remove();b.length=0,P.value=e;for(let t of r)ve(t.U,t.j,t.z);j(),S()}ee()}function Re(){b.length||ve(!0,ye())}function ee(){x(P);for(let e of b)x(e.D)}function S(){X();try{let e=V(P.value,1,ze),r=Array.isArray(e.entryPoints)?e.entryPoints:e.entryPoints=[],t=Object.create(null),n=Object.create(null),a;for(let o of b){let i=o.H.value.trim();if((n[i]||(n[i]=[])).push(o),i)t[i]=o.D.value,o.J.classList.contains("entryPoint")&&!r.includes(i)&&r.push(i);else{let c=e.stdin&&typeof e.stdin=="object"?e.stdin:e.stdin={};c.contents=o.D.value,"resolveDir"in c||(c.resolveDir="/")}}for(let o in n){let i=n[o];if(i.length>1){for(let d of i)d.J.classList.add("duplicate");a||(a=new Error("Duplicate input file: "+(o?JSON.stringify(o):"<stdin>")))}else i[0].J.classList.remove("duplicate")}if(a)throw a;Y({Z:"build",Y:t,W:e}).then(o=>{ue(o,r.length)},()=>{})}catch(e){ue({N:Z(e)},-1)}for(let e of b)e.se.innerHTML="";if(!P.value&&b.length===1&&!b[0].D.value){let e=document.createElement("a");e.href="javascript:void 0",e.textContent="Load an example...",e.onclick=()=>xe(`--bundle
--format=esm
--outfile=out.js
--sourcemap
--drop-labels:DEBUG
--minify-identifiers`,[{U:!0,j:"entry.ts",z:`// This import will be inlined by the bundler
import * as UnionFind from '@example/union-find'

// Type declarations are automatically removed
export type Graph<K, V> = Map<K, Node<K, V>>
export interface Node<K, V> {
  data: V
  edges: K[]
}

export function connectedComponents<K, V>(graph: Graph<K, V>) {
  let groups = UnionFind.create(graph.keys())
  let result = new Map<K, K[]>()

  for (let [key, { edges }] of graph)
    for (let edge of edges)
      UnionFind.union(groups, key, edge)

  // This is removed by "--drop-labels:DEBUG"
  DEBUG: console.log('Groups: ' +
    UnionFind.debugString(groups))

  for (let key of graph.keys()) {
    let group = UnionFind.find(groups, key)
    let component = result.get(group) || []
    component.push(key)
    result.set(group, component)
  }

  return [...result.values()]
}

// This is removed by "--drop-labels:DEBUG"
DEBUG: {
  let observed = JSON.stringify(
    connectedComponents(new Map([
      ['A', { data: 1, edges: ['C'] }],
      ['B', { data: 2, edges: ['B'] }],
      ['C', { data: 3, edges: ['A', 'B'] }],
      ['X', { data: -1, edges: ['Y'] }],
      ['Y', { data: -2, edges: ['X'] }],
      ['Z', { data: -3, edges: [] }],
    ])))
  let expected = '[["A","B","C"],["X","Y"],["Z"]]'
  console.assert(observed === expected,
    \`Expected \${expected} but got \${observed}\`)
}`},{U:!1,j:"node_modules/@example/union-find/index.js",z:`// See: https://en.wikipedia.org/wiki/Disjoint-set_data_structure

export function create(keys) {
  let map = new Map()
  for (let x of keys)
    map.set(x, x)
  return map
}

export function find(map, x) {
  while (map.get(x) !== x)
    map.set(x, x = map.get(map.get(x)))
  return x
}

export function union(map, a, b) {
  map.set(find(map, a), find(map, b))
}

// This is removed by tree-shaking when unused
export function debugString(map) {
  let obj = {}
  for (let [k, v] of map) {
    obj[k] = v
    while (map.get(v) !== v)
      obj[k] += ' => ' + (v = map.get(v))
  }
  return JSON.stringify(obj, null, 2)
}`},{U:!1,j:"node_modules/@example/union-find/index.d.ts",z:`// Files related to type checking are ignored by esbuild
export declare function create<T>(keys: Iterable<T>): Map<T, T>;
export declare function find<T>(map: Map<T, T>, x: T): T;
export declare function union<T>(map: Map<T, T>, a: T, b: T): void;
export declare function debugString<T>(map: Map<T, T>): string;`}]),b[0].se.append(e)}}function ye(){if(!b.length)return"entry.js";let e=1,r="file.js";for(;b.some(t=>t.H.value.trim()===r);)r=`file${++e}.js`;return r}function j(){be.textContent="+ "+ye()}function ve(e=!1,r="",t=""){let n=()=>{let u=d.value;if(u.endsWith(".map")){let p;try{p=JSON.parse(s.value)}catch{}if(p&&typeof p=="object"){f=R(()=>{let g="";for(let k of b)if(u===k.H.value+".map"){g=k.D.value;break}return[g,JSON.stringify(p)]}),a.append(f);return}}f=$(a,s.value,f)},a=document.createElement("div"),o=document.createElement("a"),i=document.createElement("a"),d=document.createElement("input"),c=document.createElement("div"),s=document.createElement("textarea"),l=document.createElement("div"),m={J:a,H:d,D:s,se:l},f;return C(d),C(s),d.placeholder="<stdin>",d.value=r,o.className="entryToggle",o.textContent="",o.href="javascript:void 0",i.className="remove",i.textContent="\xD7",i.href="javascript:void 0",s.placeholder="(enter your code here)",s.value=t,a.className="buildInput",e&&a.classList.add("entryPoint"),c.className="hasLabel",c.append(s),l.className="underLink",a.append(o,d,i,c,l),Ke.insertBefore(a,be),d.oninput=()=>{n(),j(),S()},d.onblur=()=>{let u=d.value.trim();d.value!==u&&(d.value=u,j(),S())},s.oninput=()=>{n(),x(s),S()},o.onclick=()=>{a.classList.toggle("entryPoint"),S()},i.onclick=()=>{let u=b.indexOf(m);u<0||(b.splice(u,1),a.remove(),j(),S())},b.push(m),n(),j(),x(s),m}P.oninput=()=>{x(P),S()};be.onclick=()=>{let e=ve(!b.length,ye());e.H.focus(),e.H.select(),S()};addEventListener("resize",ee);j();var L=0,Ae=[document.getElementById("transformPanel"),document.getElementById("buildPanel")],Ge=document.getElementById("modeSwitcher"),te=Ge.querySelectorAll("a");te[0].onclick=()=>{D(0)&&(J(null),ne())};te[1].onclick=()=>{Re(),D(1)&&(J(null),ne())};function D(e){return L===e?!1:(te[L].classList.remove("active"),Ae[L].style.display="none",L=e,te[L].classList.add("active"),Ae[L].style.display="block",!0)}function ne(){L===0?(U(),F()):(ee(),S())}var Ne=new URLSearchParams(location.search),Te=Ne.get("polywasm"),re=Ne.get("pkgurl"),Ze=fetch("worker.js").then(e=>e.text()),N=null,I=null,oe=new Promise((e,r)=>{ge(t=>{let n=je(t);return n.then(e,r),ge(a=>(oe.then(o=>o.terminate()),oe=je(a),oe)),n})});async function He(e){let r=new AbortController,t=setTimeout(()=>r.abort("Timeout"),5e3);try{let n=await fetch(`https://cdn.jsdelivr.net/npm/${e}`,{signal:r.signal});if(n.ok)return clearTimeout(t),n}catch(n){console.error(n)}return fetch(`https://unpkg.com/${e}`)}async function je(e){let r,t,n;J(e==="pkgurl"?null:e);try{if(N&&N.ee(),I&&I.ee(),N=null,I=null,e==="pkgurl")t=fetch(new URL("lib/browser.min.js",re)),n=fetch(new URL("esbuild.wasm",re));else{let[m,f,u]=e.split(".").map(g=>+g),p=m===0&&(f<8||f===8&&u<33)?"":".min";t=He(`esbuild-wasm@${e}/lib/browser${p}.js`),n=He(`esbuild-wasm@${e}/esbuild.wasm`)}let a=m=>m.then(f=>{if(!f.ok)throw`${f.status} ${f.statusText}: ${f.url}`;return f}),o=Te==="0"||Te==="1"?Te:null,[i,d,c]=await Promise.all([Ze,a(t).then(m=>m.text()),a(n).then(m=>m.arrayBuffer())]),s=[d,`
var polywasm=${o};`,i],l=URL.createObjectURL(new Blob(s,{type:"application/javascript"}));return await new Promise((m,f)=>{let u=new Worker(l);u.onmessage=p=>{if(p.data.K==="slow"){let g=document.getElementById("slowWarning");g.innerHTML="<span>\u26A0\uFE0F Processing is slow because </span><span>WebAssembly is disabled \u26A0\uFE0F</span>",g.style.display="flex";return}u.onmessage=null,p.data.K==="success"?(m(u),ne()):(f(new Error("Failed to create worker")),r=p.data.me),URL.revokeObjectURL(l)},u.postMessage([e,c],[c])})}catch(a){throw Se(r||a+""),a}}function Y(e){function r(t,n){N?(I&&I.ee(),I=n):(N=n,t.onmessage=a=>{t.onmessage=null,n.ge(a.data),N=null,I&&(r(t,I),I=null)},t.postMessage(n.he))}return new Promise((t,n)=>{oe.then(a=>r(a,{he:e,ge:t,ee:()=>n(new Error("Task aborted"))}),n)})}Pe()||W(re?"pkgurl":"latest");
