var ke=["conditions","dropLabels","mainFields","resolveExtensions","target"];function V(e,r,t){let o=e.trimStart(),a=/^{|^\/[*/]/.test(o),s;if(!o)return t&&(t.innerHTML=""),{};if(a)s=je(e);else{let i=n=>{if(s[n]!==void 0)try{s[n]=new RegExp(s[n]+"")}catch(l){throw n=n.replace(/[A-Z]/g,f=>"-"+f.toLowerCase()),new Error(`Invalid regular expression for "--${n}=": ${l.message}`)}},d=n=>{if(s[n]!==void 0)try{s[n]=+s[n]}catch(l){throw n=n.replace(/[A-Z]/g,f=>"-"+f.toLowerCase()),new Error(`Invalid number for "--${n}=": ${l.message}`)}};s=Ne(e,r),d("logLimit"),d("lineLimit"),i("mangleProps"),i("reserveProps");for(let n of ke)s[n]!==void 0&&(s[n]=(s[n]+"").split(","));let c=s.supported;if(typeof c=="object"&&c!==null)for(let n in c)c[n]==="true"?c[n]=!0:c[n]==="false"&&(c[n]=!1);if(s.tsconfigRaw!==void 0)try{s.tsconfigRaw=JSON.parse(s.tsconfigRaw)}catch{}}if(t){let i,d=document.createElement("a");if(d.href="javascript:void 0",t.innerHTML="",a)try{i=Je(s),d.textContent="Switch to CLI syntax"}catch{}else i=Ue(s),d.textContent="Switch to JS syntax";i!==void 0&&(d.onclick=()=>{let c=t.parentElement.querySelector("textarea");t.innerHTML="",c.value=i,c.dispatchEvent(new Event("input"))},t.append(d))}return s}function Ne(e,r){let t=[],o=e.length,a=0,s=0,i=0;for(;i<o;){let l=i,f=a,g=i-s,u="",p=e[i];if(p===" "||p==="	"||p===`
`){i++,p===`
`&&(a++,s=i);continue}for(;i<o&&(p=e[i],!(p===" "||p==="	"||p===`
`));)if(i++,p==="\\"&&i<o)p=e[i++],p===`
`?(a++,s=i):u+=p;else if(p==="'"){let m=a,k=i-s-1;for(;i===o&&ie(e,"'",m,k,a,i-s),p=e[i++],p!=="'";){if(p==="\\"&&i<o&&e[i]!=="'"&&(p=e[i++],p===`
`)){a++,s=i;continue}p===`
`&&(a++,s=i),u+=p}}else if(p==='"'){let m=a,k=i-s-1;for(;i===o&&ie(e,'"',m,k,a,i-s),p=e[i++],p!=='"';){if(p==="\\"&&i<o&&(p=e[i++],p===`
`)){a++,s=i;continue}p===`
`&&(a++,s=i),u+=p}}else u+=p;t.push({L:u,E:f,k:g,q:i-l})}let d=[],c=Object.create(null),n=(l,f)=>(l!==l.toLowerCase()&&y(e,"Invalid CLI-style flag: "+JSON.stringify("--"+l),f.E,f.k,l.length+2),l.replace(/-(\w)/g,(g,u)=>u.toUpperCase()));for(let{L:l,...f}of t){let g=l.indexOf("=");if(l.startsWith("--")){let u=l.indexOf(":");if(u>=0&&g<0){let p=n(l.slice(2,u),f),m=l.slice(u+1);(!(p in c)||!Array.isArray(c[p]))&&(c[p]=[]),c[p].push(m)}else if(u>=0&&u<g){let p=n(l.slice(2,u),f),m=l.slice(u+1,g),k=l.slice(g+1);(!(p in c)||typeof c[p]!="object"||Array.isArray(c[p]))&&(c[p]=Object.create(null)),c[p][m]=k}else if(g>=0){let p=l.slice(g+1);c[n(l.slice(2,g),f)]=p==="true"?!0:p==="false"?!1:p}else c[n(l.slice(2),f)]=!0}else l.startsWith("-")||r===0?y(e,'All CLI-style flags must start with "--"',f.E,f.k,f.q):(c.entryPoints=d,d.push(g<0?l:{in:l.slice(g+1),out:l.slice(0,g)}))}return d.length&&(c.entryPoints=d),c}function je(e){let r=()=>{let g=l.v===10?"string":(l.v===8?"identifier ":"")+JSON.stringify(l.L);return y(e,`Unexpected ${g} in ${s}`,l.E,l.k,l.L.length)},t=(g,u,p)=>y(e,`Expected "${u}" after ${p} in ${s}`,g.E,g.k+g.L.length,0,"",0,0,0,u),o=(g=!1)=>{for(;n<i;){let u=d,p=n-c,m=e[n];if(m===`
`){d++,c=++n;continue}if(m===" "||m==="	"){n++;continue}if(m==="/"){let M=n++;if(n<i&&e[n]==="/"){for(n++;n<i&&e[n]!==`
`;)n++;continue}if(n<i&&e[n]==="*"){for(n++;;)if(n===i&&y(e,'Expected "*/" to terminate multi-line comment',d,n-c,0,"The multi-line comment starts here:",u,p,2,"*/"),m=e[n++],m===`
`)d++,c=n;else if(m==="*"&&n<i&&e[n]==="/"){n++;break}continue}let h=0;for(;(n===i||e[n]===`
`)&&(h?y(e,'Expected "]" to terminate character class',d,n-c,0,"The character class starts here:",d,h-c,1,"]"):y(e,'Expected "/" to terminate regular expression',d,n-c,0,"The regular expression starts here:",u,p,1,"/")),m=e[n++],!(m==="/"&&!h);)m==="]"&&h?h=0:m==="["?h=n-1:m==="\\"&&n<i&&e[n]!==`
`&&n++;for(;n<i&&/\w/.test(e[n]);)n++;let E=e.slice(M,n),v;try{v=(0,eval)(E)}catch{y(e,`Invalid regular expression in ${s}`,u,p,n-M)}l={E:u,k:p,v:9,L:E,A:v};return}g&&y(e,`Expected end of file after ${s}`,d,n-c,0);let k="-,:[]{}+".indexOf(m);if(k>=0){n++,l={E:u,k:p,v:k,L:m,A:m};return}if(m==="."||m>="0"&&m<="9"){let M=/^[\.\w]$/,h=n++;for(;n<i&&M.test(e[n]);)n++;let E=e.slice(h,n);if(!/\d/.test(E))n=h;else{let v=+E;v!==v&&y(e,`Invalid number "${E}" in ${s}`,u,p,n-h),l={E:u,k:p,v:9,L:E,A:v};return}}let Te=/^[\w\$]$/;if(Te.test(m)){let M=n++;for(;n<i&&Te.test(e[n]);)n++;let h=e.slice(M,n),E=9,v=h;h==="null"?v=null:h==="true"?v=!0:h==="false"?v=!1:h==="undefined"?v=void 0:h==="Infinity"?v=1/0:h==="NaN"?v=NaN:E=8,l={E:u,k:p,v:E,L:h,A:v};return}if(m==='"'||m==="'"){let M=n++;for(;;)if((n===i||e[n]===`
`)&&ie(e,m,u,p,d,n-c),e[n]==="\\"&&n+1<i)n+=2,e[n-1]===`
`&&(d++,c=n);else if(e[n++]===m)break;let h=e.slice(M,n),E;try{E=(0,eval)(h)}catch{y(e,`Invalid string in ${s}`,u,p,n-M)}l={E:u,k:p,v:10,L:h,A:E};return}y(e,`Unexpected ${JSON.stringify(m)} in ${s}`,d,n-c,1)}g||y(e,`Unexpected end of file in ${s}`,d,n-c,0)},a=()=>{if(l.v===5){let g=Object.create(null),u=Object.create(null);for(;o(),l.v!==6;){l.v!==10&&l.v!==8&&r();let p=u[l.A];p&&y(e,`Duplicate key ${JSON.stringify(l.A)} in object literal`,l.E,l.k,l.L.length,`The original key ${JSON.stringify(l.A)} is here:`,p.E,p.k,p.L.length);let m=l;o(),l.v!==2&&t(m,":","property "+JSON.stringify(m.A)),o(),g[m.A]=a(),u[m.A]=m;let k=l;if(o(),l.v===6)break;l.v!==1&&t(k,",","property "+JSON.stringify(m.A))}return g}if(l.v===3){let g=[],u=0;for(;o(),l.v!==4;)if(l.v!==1){g[u++]=a();let p=l;if(o(),l.v===4)break;l.v!==1&&t(p,",","array element")}else g.length=++u;return g}return l.v===9||l.v===10?l.A:l.v===7?(o(),+a()):l.v===0?(o(),-a()):r()},s="JSON5 value",i=e.length,d=0,c=0,n=0,l;o();let f=a();return o(!0),f}function y(e,r,t,o,a,s="",i=0,d=0,c=0,n){let l=e.split(`
`),f=new Error(r);throw f.V={re:"<options>",E:t+1,k:o,q:a,oe:l[t],ae:n},s&&(f.le=[{L:s,V:{re:"<options>",E:i+1,k:d,q:c,oe:l[i]}}]),f}function ie(e,r,t,o,a,s){let i=r==='"'?"double":"single";y(e,`Failed to find the closing ${i} quote`,a,s,0,`The opening ${i} quote is here:`,t,o,1,r)}function Je(e){let r=a=>/[ \t\n\\'"]/.test(a)?'"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"':a,t=a=>a.replace(/[A-Z]/g,s=>"-"+s.toLowerCase()),o=[];for(let a in e){let s=t(a),i=e[a],d=typeof i;if(d==="string"||d==="boolean"||d==="number"||i===null)o.push(i===!0?"--"+s:`--${s}=${i}`);else if(Array.isArray(i))if(ke.includes(a))o.push(`--${s}=${i}`);else for(let c of i)o.push(a==="entryPoints"?typeof c=="object"&&c!==null&&typeof c.in=="string"&&typeof c.out=="string"?`${c.out}=${c.in}`:c:`--${s}:${c}`);else if(i instanceof RegExp)o.push(`--${s}=${i.source}`);else if(a==="tsconfigRaw")o.push(`--${s}=${JSON.stringify(i)}`);else if(d==="object"&&a!=="mangleCache"&&a!=="stdin")for(let c in i)o.push(`--${s}:${c}=${i[c]}`);else throw new Error("Not representable")}return o.map(r).join(" ")}function Ue(e){let r=(t,o,a=!0)=>{let s=typeof t;if(s==="string"){let c=t.replace(/\\/g,"\\\\").replace(/\n/g,"\\n"),n=c.split("'"),l=c.split('"');return l.length<n.length?'"'+l.join('\\"')+'"':"'"+n.join("\\'")+"'"}if(s==="boolean"||s==="number"||t instanceof RegExp)return t+"";let i=o+"  ";if(Array.isArray(t)){let c=t.every(l=>typeof l=="string"),n="[";for(let l of t)n+=n==="["?c?"":`
`+i:c?", ":i,n+=r(l,i,!1),c||(n+=`,
`);return n!=="["&&!c&&(n+=o),n+"]"}let d="{";for(let c in t){let n=t[c];d+=d==="{"?a?`
`+i:" ":a?i:", ",d+=`${/^[A-Za-z$_][A-Za-z0-9$_]*$/.test(c)?c:r(c,"")}: ${r(n,i)}`,a&&(d+=`,
`)}return d!=="{"&&(d+=a?o:" "),d+"}"};return r(e,"")}function R(e){let r=document.createElement("a");return r.className="underLink",r.href="javascript:void 0",r.target="_blank",r.textContent="Visualize this source map",r.onclick=()=>{let[t,o]=e(),a=`${t.length}\0${t}${o.length}\0${o}`;r.href="https://evanw.github.io/source-map-visualization/#"+btoa(a),setTimeout(()=>r.href="javascript:void 0")},r}function Fe(e){let r=/\/(\/)[#@] *sourceMappingURL=([^\s]+)/.exec(e);return r||(r=/\/(\*)[#@] *sourceMappingURL=((?:[^\s*]|\*[^/])+)(?:[^*]|\*[^/])*\*\//.exec(e)),r&&r[2]}function B(e,r,t){let o=Fe(r);if(t&&t.remove(),o&&o.startsWith("data:application/json;base64,")){let a;try{a=JSON.parse(atob(o.slice(29)))}catch{}a&&typeof a=="object"&&(t=R(()=>[r,JSON.stringify(a)]),e.append(t))}return t}var w=document.getElementById("outputResult"),z=document.createElement("textarea"),le=document.createElement("textarea"),G=document.createElement("textarea"),ce=document.createElement("textarea"),K=document.createElement("textarea"),se=[],A,ae=!1;C(z,!0);C(le,!0);C(G,!0);C(ce,!0);C(K,!0);function x(e){document.body.style.paddingBottom=e.clientHeight+"px",e.style.height="0",e.style.height=e.scrollHeight+1+"px",document.body.style.paddingBottom="0"}function C(e,r=!1){e.readOnly=r,e.spellcheck=!1,e.autocapitalize="off",e.autocomplete="off"}function Z(e){let r=`\x1B[31m\u2718 \x1B[41;31m[\x1B[41;97mERROR\x1B[41;31m]\x1B[0m \x1B[1m${e&&e.message||e}\x1B[0m`,t=e&&e.V,o=e&&e.le;if(t&&(r+=Ee(t)),o)for(let a of o)r+=`
  ${a.L}`,a.V&&(r+=Ee(a.V));return r}function Ee({re:e,E:r,k:t,q:o,oe:a,ae:s}){let d=a.length,c=o<2?"^":"~".repeat(o),n=`

    ${e}:${r}:${t}:
`;if(d>80){let l=Math.max(0,Math.min(t*2+o-80>>1,t-16,d-80)),f=a.slice(l,l+80);t=Math.max(0,t-l),o=Math.min(o,f.length-t),f.length>3&&l>0&&(f="..."+f.slice(3),t=Math.max(t,3)),f.length>3&&l+80<d&&(f=f.slice(0,f.length-3)+"...",o=Math.max(0,Math.min(o,f.length-3-t))),a=f}return n+=`\x1B[37m${r.toString().padStart(7)} \u2502 ${a.slice(0,t)}\x1B[32m${a.slice(t,t+o)}\x1B[37m${a.slice(t+o)}
`,s&&(n+=`        \u2502 ${" ".repeat(t)}\x1B[32m${c}\x1B[37m
`,c=s),n+=`        \u2575 ${" ".repeat(t)}\x1B[32m${c}\x1B[0m
`,n}function H(e,r,t){if(t!==void 0){let o=document.createElement("div");return e.textContent=t.replace(/\n$/,""),o.id=r,o.className="hasLabel",o.append(e),w.append(o),x(e),o}}function pe({ce:e,ue:r,X:t,de:o,N:a}){if(w.innerHTML="",H(z,"transformOutput",e),r?(H(K,"sourceMap",r),A&&A.remove(),A=R(()=>[e||"",JSON.stringify(JSON.parse(r))]),K.parentElement.append(A)):A=B(z.parentElement,e||"",A),t&&H(G,"transformMangleCache",JSON.stringify(t,null,2)),H(le,"legalComments",o),a){let s=document.createElement("div");s.id="stderrLog",s.innerHTML=Le(a),w.append(s)}if(e===void 0&&!a){let s=document.createElement("div");s.id="outputStatus",s.textContent="(no output)",w.append(s)}}function de({fe:e,pe:r,X:t,N:o},a){if(w.innerHTML="",se.length=0,e){e.sort((s,i)=>+(s.path>i.path)-+(s.path<i.path));for(let s of e){let i=document.createElement("div"),d=document.createElement("div"),c=document.createElement("textarea");if(d.className="outputPath",d.textContent=s.path.replace(/^\//,""),c.readOnly=!0,c.value=s.text.replace(/\n$/,""),C(c),i.className="buildOutput hasLabel",i.append(c),s.path.endsWith(".map")){for(let n of e)if(s.path===n.path+".map"){i.append(R(()=>[n.text,JSON.stringify(JSON.parse(s.text))]));break}}else B(i,s.text,void 0);w.append(d,i),se.push(c),x(c)}}if(o){let s=document.createElement("div");s.id="stderrLog",s.innerHTML=Le(o),w.append(s)}if((!e||!e.length)&&!o){let s=document.createElement("div");s.id="outputStatus",s.textContent=a?"(no output)":"(no entry points)",w.append(s)}if(t&&H(G,"mangleCache",JSON.stringify(t,null,2)),r){let s=H(ce,"metafile",JSON.stringify(r,null,2)),i=document.createElement("a");i.className="underLink",i.href="javascript:void 0",i.target="_blank",i.textContent="Analyze this metafile",i.onclick=()=>{i.href="/analyze/#"+btoa(JSON.stringify(r)),setTimeout(()=>i.href="javascript:void 0")},s.append(i)}}function J(e){e&&(ae=!1),!ae&&(w.innerHTML=`<span id="outputStatus">Loading${e?" version "+e:""}...</span>`)}function we(e){ae=!0,w.innerHTML="";let r=document.createElement("div");r.className="problem",r.innerHTML=`\u274C Failed to load esbuild: ${e}`,w.append(r)}function Le(e){return"<span>"+e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\033\[([^m]*)m/g,(r,t)=>{switch(t){case"1":return'</span><span class="color-bold">';case"31":return'</span><span class="color-red">';case"32":return'</span><span class="color-green">';case"33":return'</span><span class="color-yellow">';case"35":return'</span><span class="color-magenta">';case"37":return'</span><span class="color-dim">';case"41;31":return'</span><span class="bg-red color-red">';case"41;97":return'</span><span class="bg-red color-white">';case"43;33":return'</span><span class="bg-yellow color-yellow">';case"43;30":return'</span><span class="bg-yellow color-black">';case"0":return"</span><span>"}throw new Error(`Unknown escape sequence: ${t}`)})+"</span>"}addEventListener("resize",()=>{if(L===0)x(z),x(K),x(le);else{for(let e of se)x(e);x(ce)}x(G)});var O=document.querySelector("#transformOptions textarea"),We=document.querySelector("#transformOptions .underLink"),$=document.querySelector("#transformInput textarea"),ue=document.querySelector("#transformInput .underLink"),Se;function Me(){return[O.value,$.value]}function fe(e,r){(O.value!==e||$.value!==r)&&(O.value=e,$.value=r,F()),U()}function U(){x(O),x($)}function F(){let e=O.value,r=$.value;X(),Se=B($.parentElement,r,Se);try{Y({Z:"transform",Y:r,W:V(e,0,We)}).then(t=>{pe(t)},()=>{})}catch(t){pe({N:Z(t)})}if(ue.innerHTML="",!e&&!r){let t=document.createElement("a");t.href="javascript:void 0",t.textContent="Load an example...",t.onclick=Ce,ue.append(t)}}function Ce(){fe(`--target=es6
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
}`)}O.oninput=()=>{x(O),F()};$.oninput=()=>{x($),F()};ue.querySelector("a").onclick=Ce;addEventListener("resize",U);U();var Ie=De(),T=document.querySelector("#versionPicker select"),Q=document.createElement("option"),_;Q.textContent="Loading...";T.append(Q);T.disabled=!0;Ie.then(e=>{let r=e.filter(t=>!/^0\.[0-4]\.|^0\.5\.0/.test(t));T.disabled=!1,Q.remove();for(let t of r){let o=document.createElement("option");o.textContent=t,T.append(o)}T.onchange=()=>_(T.value),T.selectedIndex=-1},()=>{Q.textContent="\u274C Loading failed!"});function $e(){return T.disabled?null:T.selectedIndex<0?"pkgurl":T.value}function me(e){_=e}async function W(e){if(e==="pkgurl")T.selectedIndex!==-1&&(T.selectedIndex=-1,await _("pkgurl"));else{let r=await Ie,t=e==="latest"?r.length?0:-1:r.indexOf(e);t>=0&&T.selectedIndex!==t&&(T.selectedIndex=t,await _(r[t]))}}async function De(){let e=new AbortController,r=setTimeout(()=>e.abort("Timeout"),5e3);try{let t="https://data.jsdelivr.com/v1/package/npm/esbuild-wasm",o=await fetch(t,{signal:e.signal});if(o&&o.ok){clearTimeout(r);let a=(await o.json()).versions;if(a&&a.length)return console.log(`Loaded ${a.length} versions from ${t}`),a}}catch(t){console.error(t)}try{let t="https://registry.npmjs.org/esbuild-wasm",o=(await fetch(t).then(a=>a.json())).versions;if(o&&(o=Object.keys(o).reverse(),o.length))return console.log(`Loaded ${o.length} versions from ${t}`),o}catch(t){console.error(t)}throw new Error}function Be(){let e=location.hash,r=atob(e.slice(1)).split("\0");if(r[0]==="t"&&r.length===4)return D(0),fe(r[2],r[3]),W(r[1]),!0;if(r[0]==="b"&&r.length%3===0){let t=[];for(let o=3;o<r.length;o+=3)t.push({U:r[o]==="e",j:r[o+1],z:r[o+2]});return D(1),he(r[2],t),W(r[1]),!0}if(location.hash!=="")try{history.replaceState({},"",location.pathname+location.search)}catch{}return!1}function X(){let e=$e();if(!e)return;let r;if(L===0){let[o,a]=Me();(o||a)&&(r=["t",e,o,a])}else{let[o,a]=ge();r=["b",e,o];for(let s of a)r.push(s.U?"e":"",s.j,s.z)}let t=location.pathname+location.search;try{let o=r?"#"+btoa(r.join("\0")).replace(/=+$/,""):"";location.hash!==o&&history.replaceState({},"",o||t)}catch{if(location.hash!=="")try{history.replaceState({},"",t)}catch{}}}var P=document.querySelector("#buildOptions textarea"),Ve=document.querySelector("#buildOptions .underLink"),xe=document.getElementById("addInput"),qe=document.getElementById("buildInputs"),b=[];function ge(){return[P.value,b.map(e=>({U:e.J.classList.contains("entryPoint"),j:e.H.value.trim(),z:e.D.value}))]}function he(e,r){if(JSON.stringify([e,r])!==JSON.stringify(ge())){for(let t of b)t.J.remove();b.length=0,P.value=e;for(let t of r)ye(t.U,t.j,t.z);N(),S()}ee()}function Oe(){b.length||ye(!0,be())}function ee(){x(P);for(let e of b)x(e.D)}function S(){X();try{let e=V(P.value,1,Ve),r=Array.isArray(e.entryPoints)?e.entryPoints:e.entryPoints=[],t=Object.create(null),o=Object.create(null),a;for(let s of b){let i=s.H.value.trim();if((o[i]||(o[i]=[])).push(s),i)t[i]=s.D.value,s.J.classList.contains("entryPoint")&&!r.includes(i)&&r.push(i);else{let c=e.stdin&&typeof e.stdin=="object"?e.stdin:e.stdin={};c.contents=s.D.value,"resolveDir"in c||(c.resolveDir="/")}}for(let s in o){let i=o[s];if(i.length>1){for(let d of i)d.J.classList.add("duplicate");a||(a=new Error("Duplicate input file: "+(s?JSON.stringify(s):"<stdin>")))}else i[0].J.classList.remove("duplicate")}if(a)throw a;Y({Z:"build",Y:t,W:e}).then(s=>{de(s,r.length)},()=>{})}catch(e){de({N:Z(e)},-1)}for(let e of b)e.se.innerHTML="";if(!P.value&&b.length===1&&!b[0].D.value){let e=document.createElement("a");e.href="javascript:void 0",e.textContent="Load an example...",e.onclick=()=>he(`--bundle
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
export declare function debugString<T>(map: Map<T, T>): string;`}]),b[0].se.append(e)}}function be(){if(!b.length)return"entry.js";let e=1,r="file.js";for(;b.some(t=>t.H.value.trim()===r);)r=`file${++e}.js`;return r}function N(){xe.textContent="+ "+be()}function ye(e=!1,r="",t=""){let o=()=>{let u=d.value;if(u.endsWith(".map")){let p;try{p=JSON.parse(n.value)}catch{}if(p&&typeof p=="object"){g=R(()=>{let m="";for(let k of b)if(u===k.H.value+".map"){m=k.D.value;break}return[m,JSON.stringify(p)]}),a.append(g);return}}g=B(a,n.value,g)},a=document.createElement("div"),s=document.createElement("a"),i=document.createElement("a"),d=document.createElement("input"),c=document.createElement("div"),n=document.createElement("textarea"),l=document.createElement("div"),f={J:a,H:d,D:n,se:l},g;return C(d),C(n),d.placeholder="<stdin>",d.value=r,s.className="entryToggle",s.textContent="",s.href="javascript:void 0",i.className="remove",i.textContent="\xD7",i.href="javascript:void 0",n.placeholder="(enter your code here)",n.value=t,a.className="buildInput",e&&a.classList.add("entryPoint"),c.className="hasLabel",c.append(n),l.className="underLink",a.append(s,d,i,c,l),qe.insertBefore(a,xe),d.oninput=()=>{o(),N(),S()},d.onblur=()=>{let u=d.value.trim();d.value!==u&&(d.value=u,N(),S())},n.oninput=()=>{o(),x(n),S()},s.onclick=()=>{a.classList.toggle("entryPoint"),S()},i.onclick=()=>{let u=b.indexOf(f);u<0||(b.splice(u,1),a.remove(),N(),S())},b.push(f),o(),N(),x(n),f}P.oninput=()=>{x(P),S()};xe.onclick=()=>{let e=ye(!b.length,be());e.H.focus(),e.H.select(),S()};addEventListener("resize",ee);N();var L=0,Pe=[document.getElementById("transformPanel"),document.getElementById("buildPanel")],ze=document.getElementById("modeSwitcher"),te=ze.querySelectorAll("a");te[0].onclick=()=>{D(0)&&(J(null),ne())};te[1].onclick=()=>{Oe(),D(1)&&(J(null),ne())};function D(e){return L===e?!1:(te[L].classList.remove("active"),Pe[L].style.display="none",L=e,te[L].classList.add("active"),Pe[L].style.display="block",!0)}function ne(){L===0?(U(),F()):(ee(),S())}var He=new URLSearchParams(location.search),ve=He.get("polywasm"),re=He.get("pkgurl"),Ke=fetch("worker.js").then(e=>e.text()),j=null,I=null,oe=new Promise((e,r)=>{me(t=>{let o=Ae(t);return o.then(e,r),me(a=>(oe.then(s=>s.terminate()),oe=Ae(a),oe)),o})});async function Re(e){let r=new AbortController,t=setTimeout(()=>r.abort("Timeout"),5e3);try{let o=await fetch(`https://cdn.jsdelivr.net/npm/${e}`,{signal:r.signal});if(o.ok)return clearTimeout(t),o}catch(o){console.error(o)}return fetch(`https://unpkg.com/${e}`)}async function Ae(e){let r,t,o;J(e==="pkgurl"?null:e);try{if(j&&j.ee(),I&&I.ee(),j=null,I=null,e==="pkgurl")t=fetch(new URL("lib/browser.min.js",re)),o=fetch(new URL("esbuild.wasm",re));else{let[f,g,u]=e.split(".").map(m=>+m),p=f===0&&(g<8||g===8&&u<33)?"":".min";t=Re(`esbuild-wasm@${e}/lib/browser${p}.js`),o=Re(`esbuild-wasm@${e}/esbuild.wasm`)}let a=f=>f.then(g=>{if(!g.ok)throw`${g.status} ${g.statusText}: ${g.url}`;return g}),s=ve==="0"||ve==="1"?ve:null,[i,d,c]=await Promise.all([Ke,a(t).then(f=>f.text()),a(o).then(f=>f.arrayBuffer())]),n=[d,`
var polywasm=${s};`,i],l=URL.createObjectURL(new Blob(n,{type:"application/javascript"}));return await new Promise((f,g)=>{let u=new Worker(l);u.onmessage=p=>{if(p.data.K==="slow"){let m=document.getElementById("slowWarning");m.innerHTML="<span>\u26A0\uFE0F Processing is slow because </span><span>WebAssembly is disabled \u26A0\uFE0F</span>",m.style.display="flex";return}u.onmessage=null,p.data.K==="success"?(f(u),ne()):(g(new Error("Failed to create worker")),r=p.data.me),URL.revokeObjectURL(l)},u.postMessage([e,c],[c])})}catch(a){throw we(r||a+""),a}}function Y(e){function r(t,o){j?(I&&I.ee(),I=o):(j=o,t.onmessage=a=>{t.onmessage=null,o.ge(a.data),j=null,I&&(r(t,I),I=null)},t.postMessage(o.he))}return new Promise((t,o)=>{oe.then(a=>r(a,{he:e,ge:t,ee:()=>o(new Error("Task aborted"))}),o)})}Be()||W(re?"pkgurl":"latest");
