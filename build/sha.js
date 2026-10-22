function sha256hex(s){const m=new TextEncoder().encode(String(s)),K=[],H=[];let p=2,n=0;
 const fr=x=>((x-Math.floor(x))*4294967296)|0;
 for(;n<64;p++){let pr=1;for(let d=2;d*d<=p;d++)if(p%d==0){pr=0;break}if(pr){if(n<8)H[n]=fr(Math.pow(p,.5));K[n++]=fr(Math.pow(p,1/3))}}
 const l=m.length,nb=((l+9+63)>>6)<<6,w=new Uint8Array(nb);w.set(m);w[l]=128;
 const dv=new DataView(w.buffer);dv.setUint32(nb-8,Math.floor(l*8/4294967296));dv.setUint32(nb-4,(l*8)>>>0);
 const W=new Array(64),R=(x,c)=>(x>>>c)|(x<<(32-c));
 for(let o=0;o<nb;o+=64){for(let i=0;i<16;i++)W[i]=dv.getUint32(o+i*4);
  for(let i=16;i<64;i++){const a=W[i-15],b=W[i-2];W[i]=(W[i-16]+(R(a,7)^R(a,18)^(a>>>3))+W[i-7]+(R(b,17)^R(b,19)^(b>>>10)))|0}
  let[a,b,c,d,e,f,g,h]=H;
  for(let i=0;i<64;i++){const t1=(h+(R(e,6)^R(e,11)^R(e,25))+((e&f)^(~e&g))+K[i]+W[i])|0,t2=((R(a,2)^R(a,13)^R(a,22))+((a&b)^(a&c)^(b&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}
  H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0}
 return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}
function gCopyFb(t){const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();return ok}
