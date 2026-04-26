/* Orbital worker source — runs planet + asteroid Kepler integration off the
   main thread. Exported as a string so Portfolio.jsx can create a Blob URL
   and spawn a Worker without a separate build step or import.meta.url tricks.

   To customise orbital mechanics, edit the constants here.
   ECL_YF / ECL_ZF define the ecliptic tilt (60° default). */

export const ORBITAL_WORKER_CODE = `
const ECL_YF=0.866, ECL_ZF=0.5;
let planets=[], asteroids=[], workerTime=0;
self.onmessage=function(e){
  const{type,data}=e.data;
  if(type==='init'){ planets=data.planets; asteroids=data.asteroids; }
  if(type==='tick'){
    workerTime=data.time; const dt=data.delta;
    const planetPositions=planets.map(p=>{
      p.phase+=p.speed*dt;
      return{x:Math.cos(p.phase)*p.radius, y:Math.sin(p.phase)*p.radius*ECL_YF, z:Math.sin(p.phase)*p.radius*ECL_ZF, phase:p.phase};
    });
    const astPos=new Float32Array(asteroids.length*3);
    asteroids.forEach((a,i)=>{
      a.phase+=a.speed*0.01;
      astPos[i*3]=Math.cos(a.phase+a.tilt)*a.radius;
      astPos[i*3+1]=Math.sin(a.phase+a.tilt)*a.radius*ECL_YF+a.yBase+Math.sin(workerTime*0.6+a.phase)*a.amp;
      astPos[i*3+2]=Math.sin(a.phase+a.tilt)*a.radius*ECL_ZF;
    });
    self.postMessage({type:'positions',planetPositions,astPos:astPos.buffer,phases:planets.map(p=>p.phase)},[astPos.buffer]);
  }
};`;
