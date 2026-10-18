const http=require("http"),fs=require("fs"),path=require("path");
const root=__dirname,types={".html":"text/html",".js":"text/javascript",".css":"text/css",".mp4":"video/mp4"};
http.createServer((q,r)=>{let p;
try{p=path.join(root,decodeURIComponent(q.url.split("?")[0]));if(p.includes("\0"))throw 0}catch{r.writeHead(400);return r.end()}
if(p!==root&&!p.startsWith(root+path.sep)){r.writeHead(403);return r.end()}
if(p.endsWith(path.sep)||p===root)p=path.join(p,"index.html");
fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{"Content-Type":types[path.extname(p)]||"application/octet-stream"});r.end(d)})}).listen(8765,"127.0.0.1",()=>console.log("Open http://localhost:8765"));
