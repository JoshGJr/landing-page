const http=require("http"),fs=require("fs"),path=require("path");
const root=__dirname,types={".html":"text/html",".js":"text/javascript",".css":"text/css",".mp4":"video/mp4"};
http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split("?")[0]));if(p.endsWith(path.sep)||p===root)p=path.join(p,"index.html");
fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{"Content-Type":types[path.extname(p)]||"application/octet-stream"});r.end(d)})}).listen(8765,()=>console.log("Open http://localhost:8765"));
