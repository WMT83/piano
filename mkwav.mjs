import fs from 'fs';
const SR=44100;
function piano(midi,dur,amp=0.55){
  const f=440*Math.pow(2,(midi-69)/12); const n=Math.floor(SR*dur); const out=new Float32Array(n);
  const P=[1,.62,.41,.27,.18,.12,.09,.06,.04,.03];
  for(let i=0;i<n;i++){const t=i/SR;let s=0;
    P.forEach((g,k)=>{const h=k+1;const fh=f*h*Math.sqrt(1+0.0004*h*h);s+=g*Math.sin(2*Math.PI*fh*t);});
    const env=Math.min(1,t/0.006)*Math.exp(-t*1.5);
    out[i]=amp*s*env;}
  return out;
}
const seq=[[60,0.9],[64,0.9],[67,0.9],[72,0.9]]; // C4 E4 G4 C5
const parts=seq.map(([m,d])=>piano(m,d));
const gap=Math.floor(SR*0.12);
let total=parts.reduce((a,b)=>a+b.length,0)+gap*parts.length;
const buf=new Float32Array(total); let o=0;
parts.forEach(p=>{buf.set(p,o);o+=p.length+gap;});
// 16-bit PCM mono WAV
const b=Buffer.alloc(44+buf.length*2);
b.write('RIFF',0); b.writeUInt32LE(36+buf.length*2,4); b.write('WAVE',8);
b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22);
b.writeUInt32LE(SR,24); b.writeUInt32LE(SR*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34);
b.write('data',36); b.writeUInt32LE(buf.length*2,40);
for(let i=0;i<buf.length;i++) b.writeInt16LE(Math.max(-32768,Math.min(32767,buf[i]*32767)),44+i*2);
fs.writeFileSync('/tmp/notes.wav',b);
console.log('wrote /tmp/notes.wav', (b.length/1024).toFixed(0),'kB — sequence C4 E4 G4 C5');
