var Le=["conditions","dropLabels","mainFields","resolveExtensions","target"];function z(e,r,t){let n=e.trimStart(),a=/^{|^\/[*/]/.test(n),i;if(!n)return t&&(t.innerHTML=""),{};if(a)i=Ve(e);else{let p=o=>{if(i[o]!==void 0)try{i[o]=new RegExp(i[o]+"")}catch(l){throw o=o.replace(/[A-Z]/g,h=>"-"+h.toLowerCase()),new Error(`Invalid regular expression for "--${o}=": ${l.message}`)}},c=o=>{if(i[o]!==void 0)try{i[o]=+i[o]}catch(l){throw o=o.replace(/[A-Z]/g,h=>"-"+h.toLowerCase()),new Error(`Invalid number for "--${o}=": ${l.message}`)}};i=De(e,r),c("logLimit"),c("lineLimit"),p("mangleProps"),p("reserveProps");for(let o of Le)i[o]!==void 0&&(i[o]=(i[o]+"").split(","));let u=i.supported;if(typeof u=="object"&&u!==null)for(let o in u)u[o]==="true"?u[o]=!0:u[o]==="false"&&(u[o]=!1)}let s=i.tsconfigRaw;if(s!==void 0)try{s=JSON.parse(s)}catch{}return t&&(t.innerHTML="",Ue(t,a,i,s,e),We(t,a,i,s)),i}function Ue(e,r,t,n,a){if(n===void 0&&(n={}),typeof n!="object")return;let i=n.compilerOptions;if(i===void 0&&(i={}),typeof i=="object"&&(t.loader==="ts"||t.loader==="tsx")&&typeof i.experimentalDecorators!="boolean"){let s={...t,tsconfigRaw:{...n,compilerOptions:{...i,experimentalDecorators:!0}}},p;if(r)p=Se(s);else if(t.tsconfigRaw===void 0)p=[a,/\n/.test(a)?`
`:" ",le({tsconfigRaw:s.tsconfigRaw})].join("");else try{p=le(s)}catch{}if(p!==void 0){let c=document.createElement("a");c.href="javascript:void 0",c.textContent="Enable TS experimental decorators",c.onclick=()=>{let u=e.parentElement.querySelector("textarea");e.innerHTML="",u.value=p,u.dispatchEvent(new Event("input"))},e.append(c," ")}}}function We(e,r,t,n){let a,i=document.createElement("a");if(r)try{a=le(t),i.textContent="Switch to CLI syntax"}catch{}else a=Se(n?{...t,tsconfigRaw:n}:t),i.textContent="Switch to JS syntax";a!==void 0&&(i.href="javascript:void 0",i.onclick=()=>{let s=e.parentElement.querySelector("textarea");e.innerHTML="",s.value=a,s.dispatchEvent(new Event("input"))},e.append(i))}function De(e,r){let t=[],n=e.length,a=0,i=0,s=0;for(;s<n;){let o=s,l=a,h=s-i,f="",d=e[s];if(d===" "||d==="	"||d===`
`){s++,d===`
`&&(a++,i=s);continue}for(;s<n&&(d=e[s],!(d===" "||d==="	"||d===`
`));)if(s++,d==="\\"&&s<n)d=e[s++],d===`
`?(a++,i=s):f+=d;else if(d==="'"){let g=a,m=s-i-1;for(;s===n&&ae(e,"'",g,m,a,s-i),d=e[s++],d!=="'";){if(d==="\\"&&s<n&&e[s]!=="'"&&(d=e[s++],d===`
`)){a++,i=s;continue}d===`
`&&(a++,i=s),f+=d}}else if(d==='"'){let g=a,m=s-i-1;for(;s===n&&ae(e,'"',g,m,a,s-i),d=e[s++],d!=='"';){if(d==="\\"&&s<n&&(d=e[s++],d===`
`)){a++,i=s;continue}d===`
`&&(a++,i=s),f+=d}}else f+=d;t.push({L:f,E:l,k:h,q:s-o})}let p=[],c=Object.create(null),u=(o,l)=>(o!==o.toLowerCase()&&v(e,"Invalid CLI-style flag: "+JSON.stringify("--"+o),l.E,l.k,o.length+2),o.replace(/-(\w)/g,(h,f)=>f.toUpperCase()));for(let{L:o,...l}of t){let h=o.indexOf("=");if(o.startsWith("--")){let f=o.indexOf(":");if(f>=0&&h<0){let d=u(o.slice(2,f),l),g=o.slice(f+1);(!(d in c)||!Array.isArray(c[d]))&&(c[d]=[]),c[d].push(g)}else if(f>=0&&f<h){let d=u(o.slice(2,f),l),g=o.slice(f+1,h),m=o.slice(h+1);(!(d in c)||typeof c[d]!="object"||Array.isArray(c[d]))&&(c[d]=Object.create(null)),c[d][g]=m}else if(h>=0){let d=o.slice(h+1);c[u(o.slice(2,h),l)]=d==="true"?!0:d==="false"?!1:d}else c[u(o.slice(2),l)]=!0}else o.startsWith("-")||r===0?v(e,'All CLI-style flags must start with "--"',l.E,l.k,l.q):(c.entryPoints=p,p.push(h<0?o:{in:o.slice(h+1),out:o.slice(0,h)}))}return p.length&&(c.entryPoints=p),c}function Ve(e){let r=()=>{let f=l.v===13?"string":(l.v===10?"identifier ":"")+JSON.stringify(l.L);return v(e,`Unexpected ${f} in ${s}`,l.E,l.k,l.L.length)},t=(f,d,g)=>v(e,`Expected "${d}" after ${g} in ${s}`,f.E,f.k+f.L.length,0,"",0,0,0,d),n=(f=0)=>{for(;o<p;){let d=c,g=o-u,m=e[o];if(m===`
`){c++,u=++o;continue}if(m===" "||m==="	"){o++;continue}if(m==="/"){let L=o++;if(o<p&&e[o]==="/"){for(o++;o<p&&e[o]!==`
`;)o++;continue}if(o<p&&e[o]==="*"){for(o++;;)if(o===p&&v(e,'Expected "*/" to terminate multi-line comment',c,o-u,0,"The multi-line comment starts here:",d,g,2,"*/"),m=e[o++],m===`
`)c++,u=o;else if(m==="*"&&o<p&&e[o]==="/"){o++;break}continue}let x=0;for(;(o===p||e[o]===`
`)&&(x?v(e,'Expected "]" to terminate character class',c,o-u,0,"The character class starts here:",c,x-u,1,"]"):v(e,'Expected "/" to terminate regular expression',c,o-u,0,"The regular expression starts here:",d,g,1,"/")),m=e[o++],!(m==="/"&&!x);)m==="]"&&x?x=0:m==="["?x=o-1:m==="\\"&&o<p&&e[o]!==`
`&&o++;for(;o<p&&/\w/.test(e[o]);)o++;let E=e.slice(L,o),T;try{T=(0,eval)(E)}catch{v(e,`Invalid regular expression in ${s}`,d,g,o-L)}l={E:d,k:g,v:12,L:E,A:T};return}f&2&&v(e,`Expected end of file after ${s}`,c,o-u,0);let I="-,:[]{}()+".indexOf(m);if(I>=0){o++,l={E:d,k:g,v:I,L:m,A:m};return}if(m==="."||m>="0"&&m<="9"){let L=/^[\.\w]$/,x=o++;for(;o<p&&L.test(e[o]);)o++;let E=e.slice(x,o);if(!/\d/.test(E))o=x;else{let T=+E;T!==T&&v(e,`Invalid number "${E}" in ${s}`,d,g,o-x),l={E:d,k:g,v:12,L:E,A:T};return}}let w=/^[\w\$]$/;if(w.test(m)){let L=o++;for(;o<p&&w.test(e[o]);)o++;let x=e.slice(L,o),E=12,T=x;f&1?E=10:x==="null"?T=null:x==="true"?T=!0:x==="false"?T=!1:x==="undefined"?T=void 0:x==="Infinity"?T=1/0:x==="NaN"?T=NaN:x==="function"?E=11:E=10,l={E:d,k:g,v:E,L:x,A:T};return}if(m==='"'||m==="'"){let L=o++;for(;;)if((o===p||e[o]===`
`)&&ae(e,m,d,g,c,o-u),e[o]==="\\"&&o+1<p)o+=2,e[o-1]===`
`&&(c++,u=o);else if(e[o++]===m)break;let x=e.slice(L,o),E;try{E=(0,eval)(x)}catch{v(e,`Invalid string in ${s}`,d,g,o-L)}l={E:d,k:g,v:13,L:x,A:E};return}v(e,`Unexpected ${JSON.stringify(m)} in ${s}`,c,o-u,1)}f&2||v(e,`Unexpected end of file in ${s}`,c,o-u,0)},a=(f,d)=>{let g=/\}/g,m="";g.lastIndex=d;for(let I;I=g.exec(e);)try{let w=new Function("return {"+f+e.slice(d,I.index+1)+"}."+f);return o=I.index+1,w()}catch(w){m=": "+w.message}v(e,"Invalid function literal"+m,l.E,l.k,l.L.length)},i=()=>{if(l.v===5){let f=Object.create(null),d=Object.create(null);for(;n(1),l.v!==6;){l.v!==13&&l.v!==10&&r();let g=d[l.A];g&&v(e,`Duplicate key ${JSON.stringify(l.A)} in object literal`,l.E,l.k,l.L.length,`The original key ${JSON.stringify(l.A)} is here:`,g.E,g.k,g.L.length);let m=l,I=o,w;n(),l.v===7?w=a(m.A,I):(l.v!==2&&t(m,":","property "+JSON.stringify(m.A)),n(),l.v===11?w=a(m.A,I):w=i()),f[m.A]=w,d[m.A]=m;let L=l;if(n(),l.v===6)break;l.v!==1&&t(L,",","property "+JSON.stringify(m.A))}return f}if(l.v===3){let f=[],d=0;for(;n(),l.v!==4;)if(l.v!==1){f[d++]=i();let g=l;if(n(),l.v===4)break;l.v!==1&&t(g,",","array element")}else f.length=++d;return f}return l.v===12||l.v===13?l.A:l.v===9?(n(),+i()):l.v===0?(n(),-i()):r()},s="JSON5 value",p=e.length,c=0,u=0,o=0,l;n();let h=i();return n(2),h}function v(e,r,t,n,a,i="",s=0,p=0,c=0,u){let o=e.split(`
`),l=new Error(r);throw l.V={re:"<options>",E:t+1,k:n,q:a,oe:o[t],ae:u},i&&(l.le=[{L:i,V:{re:"<options>",E:s+1,k:p,q:c,oe:o[s]}}]),l}function ae(e,r,t,n,a,i){let s=r==='"'?"double":"single";v(e,`Failed to find the closing ${s} quote`,a,i,0,`The opening ${s} quote is here:`,t,n,1,r)}function le(e){let r=a=>/[ \t\n\\'"]/.test(a)?'"'+a.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"':a,t=a=>a.replace(/[A-Z]/g,i=>"-"+i.toLowerCase()),n=[];for(let a in e){let i=t(a),s=e[a],p=typeof s;if(p==="string"||p==="boolean"||p==="number"||s===null)n.push(s===!0?"--"+i:`--${i}=${s}`);else if(Array.isArray(s))if(Le.includes(a))n.push(`--${i}=${s}`);else for(let c of s)n.push(a==="entryPoints"?typeof c=="object"&&c!==null&&typeof c.in=="string"&&typeof c.out=="string"?`${c.out}=${c.in}`:c:`--${i}:${c}`);else if(s instanceof RegExp)n.push(`--${i}=${s.source}`);else if(a==="tsconfigRaw")n.push(`--${i}=${JSON.stringify(s)}`);else if(p==="object"&&a!=="mangleCache"&&a!=="stdin")for(let c in s)n.push(`--${i}:${c}=${s[c]}`);else throw new Error("Not representable")}return n.map(r).join(" ")}function Se(e){let r=(t,n,a=!0)=>{let i=typeof t;if(i==="string"){let c=t.replace(/\\/g,"\\\\").replace(/\n/g,"\\n"),u=c.split("'"),o=c.split('"');return o.length<u.length?'"'+o.join('\\"')+'"':"'"+u.join("\\'")+"'"}if(i==="boolean"||i==="number"||t instanceof RegExp)return t+"";let s=n+"  ";if(Array.isArray(t)){let c=t.every(o=>typeof o=="string"),u="[";for(let o of t)u+=u==="["?c?"":`
`+s:c?", ":s,u+=r(o,s,!1),c||(u+=`,
`);return u!=="["&&!c&&(u+=n),u+"]"}let p="{";for(let c in t){let u=t[c];p+=p==="{"?a?`
`+s:" ":a?s:", ",p+=`${/^[A-Za-z$_][A-Za-z0-9$_]*$/.test(c)?c:r(c,"")}: ${r(u,s)}`,a&&(p+=`,
`)}return p!=="{"&&(p+=a?n:" "),p+"}"};return r(e,"")}function j(e){let r=document.createElement("a");return r.className="underLink",r.href="javascript:void 0",r.target="_blank",r.textContent="Visualize this source map",r.onclick=()=>{let[t,n]=e(),a=`${t.length}\0${t}${n.length}\0${n}`;r.href="https://evanw.github.io/source-map-visualization/#"+btoa(a),setTimeout(()=>r.href="javascript:void 0")},r}function qe(e){let r=/\/(\/)[#@] *sourceMappingURL=([^\s]+)/.exec(e);return r||(r=/\/(\*)[#@] *sourceMappingURL=((?:[^\s*]|\*[^/])+)(?:[^*]|\*[^/])*\*\//.exec(e)),r&&r[2]}function P(e,r,t){let n=qe(r);if(t&&t.remove(),n&&n.startsWith("data:application/json;base64,")){let a;try{a=JSON.parse(atob(n.slice(29)))}catch{}a&&typeof a=="object"&&(t=j(()=>[r,JSON.stringify(a)]),e.append(t))}return t}var S=document.getElementById("outputResult"),G=document.createElement("textarea"),pe=document.createElement("textarea"),X=document.createElement("textarea"),ue=document.createElement("textarea"),Z=document.createElement("textarea"),ce=[],H,de=!1;C(G,!0);C(pe,!0);C(X,!0);C(ue,!0);C(Z,!0);function y(e){document.body.style.paddingBottom=e.clientHeight+"px",e.style.height="0",e.style.height=e.scrollHeight+1+"px",document.body.style.paddingBottom="0"}function C(e,r=!1){e.readOnly=r,e.spellcheck=!1,e.autocapitalize="off",e.autocomplete="off"}function Y(e){let r=`\x1B[31m\u2718 \x1B[41;31m[\x1B[41;97mERROR\x1B[41;31m]\x1B[0m \x1B[1m${e&&e.message||e}\x1B[0m`,t=e&&e.V,n=e&&e.le;if(t&&(r+=Me(t)),n)for(let a of n)r+=`
  ${a.L}`,a.V&&(r+=Me(a.V));return r}function Me({re:e,E:r,k:t,q:n,oe:a,ae:i}){let p=a.length,c=n<2?"^":"~".repeat(n),u=`

    ${e}:${r}:${t}:
`;if(p>80){let o=Math.max(0,Math.min(t*2+n-80>>1,t-16,p-80)),l=a.slice(o,o+80);t=Math.max(0,t-o),n=Math.min(n,l.length-t),l.length>3&&o>0&&(l="..."+l.slice(3),t=Math.max(t,3)),l.length>3&&o+80<p&&(l=l.slice(0,l.length-3)+"...",n=Math.max(0,Math.min(n,l.length-3-t))),a=l}return u+=`\x1B[37m${r.toString().padStart(7)} \u2502 ${a.slice(0,t)}\x1B[32m${a.slice(t,t+n)}\x1B[37m${a.slice(t+n)}
`,i&&(u+=`        \u2502 ${" ".repeat(t)}\x1B[32m${c}\x1B[37m
`,c=i),u+=`        \u2575 ${" ".repeat(t)}\x1B[32m${c}\x1B[0m
`,u}function N(e,r,t){if(t!==void 0){let n=document.createElement("div");return e.textContent=t.replace(/\n$/,""),n.id=r,n.className="hasLabel",n.append(e),S.append(n),y(e),n}}function fe({ce:e,ue:r,X:t,de:n,N:a}){if(S.innerHTML="",N(G,"transformOutput",e),r?(N(Z,"sourceMap",r),H&&H.remove(),H=j(()=>[e||"",JSON.stringify(JSON.parse(r))]),Z.parentElement.append(H)):H=P(G.parentElement,e||"",H),t&&N(X,"transformMangleCache",JSON.stringify(t,null,2)),N(pe,"legalComments",n),a){let i=document.createElement("div");i.id="stderrLog",i.innerHTML=Ie(a),S.append(i)}if(e===void 0&&!a){let i=document.createElement("div");i.id="outputStatus",i.textContent="(no output)",S.append(i)}}function me({fe:e,pe:r,X:t,N:n},a){if(S.innerHTML="",ce.length=0,e){e.sort((i,s)=>+(i.path>s.path)-+(i.path<s.path));for(let i of e){let s=document.createElement("div"),p=document.createElement("div"),c=document.createElement("textarea");if(p.className="outputPath",p.textContent=i.path.replace(/^\//,""),c.readOnly=!0,c.value=i.text.replace(/\n$/,""),C(c),s.className="buildOutput hasLabel",s.append(c),i.path.endsWith(".map")){for(let u of e)if(i.path===u.path+".map"){s.append(j(()=>[u.text,JSON.stringify(JSON.parse(i.text))]));break}}else P(s,i.text,void 0);S.append(p,s),ce.push(c),y(c)}}if(n){let i=document.createElement("div");i.id="stderrLog",i.innerHTML=Ie(n),S.append(i)}if((!e||!e.length)&&!n){let i=document.createElement("div");i.id="outputStatus",i.textContent=a?"(no output)":"(no entry points)",S.append(i)}if(t&&N(X,"mangleCache",JSON.stringify(t,null,2)),r){let i=N(ue,"metafile",JSON.stringify(r,null,2)),s=document.createElement("a");s.className="underLink",s.href="javascript:void 0",s.target="_blank",s.textContent="Analyze this metafile",s.onclick=()=>{s.href="/analyze/#"+btoa(JSON.stringify(r)),setTimeout(()=>s.href="javascript:void 0")},i.append(s)}}function U(e){e&&(de=!1),!de&&(S.innerHTML=`<span id="outputStatus">Loading${e?" version "+e:""}...</span>`)}function Oe(e){de=!0,S.innerHTML="";let r=document.createElement("div");r.className="problem",r.innerHTML=`\u274C Failed to load esbuild: ${e}`,S.append(r)}function Ie(e){return"<span>"+e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\033\[([^m]*)m/g,(r,t)=>{switch(t){case"1":return'</span><span class="color-bold">';case"31":return'</span><span class="color-red">';case"32":return'</span><span class="color-green">';case"33":return'</span><span class="color-yellow">';case"35":return'</span><span class="color-magenta">';case"37":return'</span><span class="color-dim">';case"41;31":return'</span><span class="bg-red color-red">';case"41;97":return'</span><span class="bg-red color-white">';case"43;33":return'</span><span class="bg-yellow color-yellow">';case"43;30":return'</span><span class="bg-yellow color-black">';case"0":return"</span><span>"}throw new Error(`Unknown escape sequence: ${t}`)})+"</span>"}addEventListener("resize",()=>{if(M===0)y(G),y(Z),y(pe);else{for(let e of ce)y(e);y(ue)}y(X)});var A=document.querySelector("#transformOptions textarea"),ze=document.querySelector("#transformOptions .underLink"),$=document.querySelector("#transformInput textarea"),ge=document.querySelector("#transformInput .underLink"),Ce;function Be(){return[A.value,$.value]}function he(e,r){(A.value!==e||$.value!==r)&&(A.value=e,$.value=r,D()),W()}function W(){y(A),y($)}function D(){let e=A.value,r=$.value;Q(),Ce=P($.parentElement,r,Ce);try{_({Z:"transform",Y:r,W:z(e,0,ze)}).then(t=>{fe(t)},()=>{})}catch(t){fe({N:Y(t)})}if(ge.innerHTML="",!e&&!r){let t=document.createElement("a");t.href="javascript:void 0",t.textContent="Load an example...",t.onclick=$e,ge.append(t)}}function $e(){he(`--target=es6
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
}`)}A.oninput=()=>{y(A),D()};$.oninput=()=>{y($),D()};ge.querySelector("a").onclick=$e;addEventListener("resize",W);W();var Pe=Ke(),k=document.querySelector("#versionPicker select"),ee=document.createElement("option"),te;ee.textContent="Loading...";k.append(ee);k.disabled=!0;Pe.then(e=>{let r=e.filter(t=>!/^0\.[0-4]\.|^0\.5\.0/.test(t));k.disabled=!1,ee.remove();for(let t of r){let n=document.createElement("option");n.textContent=t,k.append(n)}k.onchange=()=>te(k.value),k.selectedIndex=-1},()=>{ee.textContent="\u274C Loading failed!"});function Ae(){return k.disabled?null:k.selectedIndex<0?"pkgurl":k.value}function xe(e){te=e}async function V(e){if(e==="pkgurl")k.selectedIndex!==-1&&(k.selectedIndex=-1,await te("pkgurl"));else{let r=await Pe,t=e==="latest"?r.length?0:-1:r.indexOf(e);t>=0&&k.selectedIndex!==t&&(k.selectedIndex=t,await te(r[t]))}}async function Ke(){let e=new AbortController,r=setTimeout(()=>e.abort("Timeout"),5e3);try{let t="https://data.jsdelivr.com/v1/package/npm/esbuild-wasm",n=await fetch(t,{signal:e.signal});if(n&&n.ok){clearTimeout(r);let a=(await n.json()).versions;if(a&&a.length)return console.log(`Loaded ${a.length} versions from ${t}`),a}}catch(t){console.error(t)}try{let t="https://registry.npmjs.org/esbuild-wasm",n=(await fetch(t).then(a=>a.json())).versions;if(n&&(n=Object.keys(n).reverse(),n.length))return console.log(`Loaded ${n.length} versions from ${t}`),n}catch(t){console.error(t)}throw new Error}function Re(){let e=location.hash,r=atob(e.slice(1)).split("\0");if(r[0]==="t"&&r.length===4)return q(0),he(r[2],r[3]),V(r[1]),!0;if(r[0]==="b"&&r.length%3===0){let t=[];for(let n=3;n<r.length;n+=3)t.push({j:r[n]==="e",U:r[n+1],z:r[n+2]});return q(1),be(r[2],t),V(r[1]),!0}if(location.hash!=="")try{history.replaceState({},"",location.pathname+location.search)}catch{}return!1}function Q(){let e=Ae();if(!e)return;let r;if(M===0){let[n,a]=Be();(n||a)&&(r=["t",e,n,a])}else{let[n,a]=ye();r=["b",e,n];for(let i of a)r.push(i.j?"e":"",i.U,i.z)}let t=location.pathname+location.search;try{let n=r?"#"+btoa(r.join("\0")).replace(/=+$/,""):"";location.hash!==n&&history.replaceState({},"",n||t)}catch{if(location.hash!=="")try{history.replaceState({},"",t)}catch{}}}var R=document.querySelector("#buildOptions textarea"),Ge=document.querySelector("#buildOptions .underLink"),ve=document.getElementById("addInput"),Ze=document.getElementById("buildInputs"),b=[];function ye(){return[R.value,b.map(e=>({j:e.J.classList.contains("entryPoint"),U:e.H.value.trim(),z:e.D.value}))]}function be(e,r){if(JSON.stringify([e,r])!==JSON.stringify(ye())){for(let t of b)t.J.remove();b.length=0,R.value=e;for(let t of r)Te(t.j,t.U,t.z);F(),O()}ne()}function je(){b.length||Te(!0,Ee())}function ne(){y(R);for(let e of b)y(e.D)}function O(){Q();try{let e=z(R.value,1,Ge),r=Array.isArray(e.entryPoints)?e.entryPoints:e.entryPoints=[],t=Object.create(null),n=Object.create(null),a;for(let i of b){let s=i.H.value.trim();if((n[s]||(n[s]=[])).push(i),s)t[s]=i.D.value,i.J.classList.contains("entryPoint")&&!r.includes(s)&&r.push(s);else{let c=e.stdin&&typeof e.stdin=="object"?e.stdin:e.stdin={};c.contents=i.D.value,"resolveDir"in c||(c.resolveDir="/")}}for(let i in n){let s=n[i];if(s.length>1){for(let p of s)p.J.classList.add("duplicate");a||(a=new Error("Duplicate input file: "+(i?JSON.stringify(i):"<stdin>")))}else s[0].J.classList.remove("duplicate")}if(a)throw a;_({Z:"build",Y:t,W:e}).then(i=>{me(i,r.length)},()=>{})}catch(e){me({N:Y(e)},-1)}for(let e of b)e.ie.innerHTML="";if(!R.value&&b.length===1&&!b[0].D.value){let e=document.createElement("a");e.href="javascript:void 0",e.textContent="Load an example...",e.onclick=()=>be(`--bundle
--format=esm
--outfile=out.js
--sourcemap
--drop-labels:DEBUG
--minify-identifiers`,[{j:!0,U:"entry.ts",z:`// This import will be inlined by the bundler
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
}`},{j:!1,U:"node_modules/@example/union-find/index.js",z:`// See: https://en.wikipedia.org/wiki/Disjoint-set_data_structure

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
}`},{j:!1,U:"node_modules/@example/union-find/index.d.ts",z:`// Files related to type checking are ignored by esbuild
export declare function create<T>(keys: Iterable<T>): Map<T, T>;
export declare function find<T>(map: Map<T, T>, x: T): T;
export declare function union<T>(map: Map<T, T>, a: T, b: T): void;
export declare function debugString<T>(map: Map<T, T>): string;`}]),b[0].ie.append(e)}}function Ee(){if(!b.length)return"entry.js";let e=1,r="file.js";for(;b.some(t=>t.H.value.trim()===r);)r=`file${++e}.js`;return r}function F(){ve.textContent="+ "+Ee()}function Te(e=!1,r="",t=""){let n=()=>{let f=p.value;if(f.endsWith(".map")){let d;try{d=JSON.parse(u.value)}catch{}if(d&&typeof d=="object"){h=j(()=>{let g="";for(let m of b)if(f===m.H.value+".map"){g=m.D.value;break}return[g,JSON.stringify(d)]}),a.append(h);return}}h=P(a,u.value,h)},a=document.createElement("div"),i=document.createElement("a"),s=document.createElement("a"),p=document.createElement("input"),c=document.createElement("div"),u=document.createElement("textarea"),o=document.createElement("div"),l={J:a,H:p,D:u,ie:o},h;return C(p),C(u),p.placeholder="<stdin>",p.value=r,i.className="entryToggle",i.textContent="",i.href="javascript:void 0",s.className="remove",s.textContent="\xD7",s.href="javascript:void 0",u.placeholder="(enter your code here)",u.value=t,a.className="buildInput",e&&a.classList.add("entryPoint"),c.className="hasLabel",c.append(u),o.className="underLink",a.append(i,p,s,c,o),Ze.insertBefore(a,ve),p.oninput=()=>{n(),F(),O()},p.onblur=()=>{let f=p.value.trim();p.value!==f&&(p.value=f,F(),O())},u.oninput=()=>{n(),y(u),O()},i.onclick=()=>{a.classList.toggle("entryPoint"),O()},s.onclick=()=>{let f=b.indexOf(l);f<0||(b.splice(f,1),a.remove(),F(),O())},b.push(l),n(),F(),y(u),l}R.oninput=()=>{y(R),O()};ve.onclick=()=>{let e=Te(!b.length,Ee());e.H.focus(),e.H.select(),O()};addEventListener("resize",ne);F();var M=0,He=[document.getElementById("transformPanel"),document.getElementById("buildPanel")],Xe=document.getElementById("modeSwitcher"),oe=Xe.querySelectorAll("a");oe[0].onclick=()=>{q(0)&&(U(null),re())};oe[1].onclick=()=>{je(),q(1)&&(U(null),re())};function q(e){return M===e?!1:(oe[M].classList.remove("active"),He[M].style.display="none",M=e,oe[M].classList.add("active"),He[M].style.display="block",!0)}function re(){M===0?(W(),D()):(ne(),O())}var Je=new URLSearchParams(location.search),ke=Je.get("polywasm"),se=Je.get("pkgurl"),Ye=fetch("worker.js").then(e=>e.text()),J=null,B=null,ie=new Promise((e,r)=>{xe(t=>{let n=Fe(t);return n.then(e,r),xe(a=>(ie.then(i=>i.terminate()),ie=Fe(a),ie)),n})});async function Ne(e){let r=new AbortController,t=setTimeout(()=>r.abort("Timeout"),5e3);try{let n=await fetch(`https://cdn.jsdelivr.net/npm/${e}`,{signal:r.signal});if(n.ok)return clearTimeout(t),n}catch(n){console.error(n)}return fetch(`https://unpkg.com/${e}`)}async function Fe(e){let r,t,n;U(e==="pkgurl"?null:e);try{if(J&&J.ee(),B&&B.ee(),J=null,B=null,e==="pkgurl")t=fetch(new URL("lib/browser.min.js",se)),n=fetch(new URL("esbuild.wasm",se));else{let[l,h,f]=e.split(".").map(g=>+g),d=l===0&&(h<8||h===8&&f<33)?"":".min";t=Ne(`esbuild-wasm@${e}/lib/browser${d}.js`),n=Ne(`esbuild-wasm@${e}/esbuild.wasm`)}let a=l=>l.then(h=>{if(!h.ok)throw`${h.status} ${h.statusText}: ${h.url}`;return h}),i=ke==="0"||ke==="1"?ke:null,[s,p,c]=await Promise.all([Ye,a(t).then(l=>l.text()),a(n).then(l=>l.arrayBuffer())]),u=[p,`
var polywasm=${i};`,s],o=URL.createObjectURL(new Blob(u,{type:"application/javascript"}));return await new Promise((l,h)=>{let f=new Worker(o);f.onmessage=d=>{if(d.data.K==="slow"){let g=document.getElementById("slowWarning");g.innerHTML="<span>\u26A0\uFE0F Processing is slow because </span><span>WebAssembly is disabled \u26A0\uFE0F</span>",g.style.display="flex";return}f.onmessage=null,d.data.K==="success"?(l(f),re()):(h(new Error("Failed to create worker")),r=d.data.me),URL.revokeObjectURL(o)},f.postMessage([e,c],[c])})}catch(a){throw Oe(r||a+""),a}}function _(e){let r=(t,n)=>{J?(B&&B.ee(),B=n):(J=n,t.onmessage=a=>{t.onmessage=null,n.ge(a.data),J=null,B&&(r(t,B),B=null)},t.postMessage(n.he))};return new Promise((t,n)=>{ie.then(a=>r(a,{he:we(e),ge:t,ee:()=>n(new Error("Task aborted"))}),n)})}var we=e=>{if(typeof e=="function"){let r=e+"";return new EvalError("function "+e.name+r.slice(r.indexOf("(")))}return typeof e=="object"&&e?Array.isArray(e)?e.map(we):Object.fromEntries(Object.entries(e).map(([r,t])=>[r,we(t)])):e};Re()||V(se?"pkgurl":"latest");
