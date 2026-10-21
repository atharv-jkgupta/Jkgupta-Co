import asyncio,json,re,zipfile,io
import xml.etree.ElementTree as ET
_t=open('/home/claude/app/build/test_app.py').read()
exec(_t[:_t.index('async def main')])
TD='/home/claude/app/testdata/'
JSZ=open('/opt/npm-tools/node_modules/jszip/dist/jszip.min.js').read()
XSHIM="""window.XLSX={utils:{book_new:()=>({s:[]}),aoa_to_sheet:a=>({a}),book_append_sheet:(w,s,n)=>w.s.push([n,s.a])},
write:(w,o)=>new TextEncoder().encode(JSON.stringify(w.s)),writeFile:(w,fn)=>{const b=new Blob([JSON.stringify(w.s)]),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fn;document.body.appendChild(a);a.click()}};"""
