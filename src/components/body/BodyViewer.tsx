'use client';
import { Suspense, useEffect, useMemo, useState, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, useGLTF, useTexture, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import CameraRig from './CameraRig';
import Fallback2D from './Fallback2D';
import { skinMaterial } from './skinMaterial';
import { useRegionPicker } from './useRegionPicker';
import { ASSET_VERSION } from './assetVersion';
import regions from '@/data/regions.json';
export type PainPin={id:string;regionId:string;point:[number,number,number];intensity:number};
export type BodyViewerProps={active?:string;back?:boolean;sex?:'male'|'female';zoom?:number;reset?:number;pins?:PainPin[];onSelect?:(id:string,point?:[number,number,number])=>void;mini?:boolean};
function Loader(){const {progress}=useProgress();return <Html center><div className="model-loader"><svg width="42" height="90" viewBox="0 0 42 90" aria-hidden="true"><circle cx="21" cy="10" r="7" fill="#cbd3be"/><path d="M15 21h12l7 24-5 2-5-16v23l5 31h-7l-2-27-3 27h-7l5-31V31L9 47l-5-2z" fill="#dce2d3"/></svg><span>Preparing your body map</span><b>{Math.round(progress)}%</b></div></Html>;}
function Quality({dragging}:{dragging:boolean}){const {setDpr}=useThree();const frames=useRef<number[]>([]);useFrame((_,delta)=>{if(!dragging){frames.current=[];return;}frames.current.push(delta);if(frames.current.length===60){if(frames.current.reduce((a,b)=>a+b,0)/60>.02)setDpr(Math.min(window.devicePixelRatio,1.5));frames.current=[];}});return null;}
function Pin({pin}:{pin:PainPin}){const ref=useRef<THREE.Group>(null);useFrame(({camera})=>{if(ref.current)ref.current.scale.setScalar(camera.position.distanceTo(ref.current.position)/3.45);});return <group ref={ref} position={pin.point}><mesh><sphereGeometry args={[.014,20,20]}/><meshStandardMaterial color={pin.intensity>6?'#cf593b':pin.intensity>3?'#e6954e':'#e4bf60'} emissive="#cf693b" emissiveIntensity={.6}/></mesh><mesh><sphereGeometry args={[.028,20,20]}/><meshBasicMaterial color="#e7a875" transparent opacity={.2}/></mesh></group>;}
function Model({sex='male',active='',onSelect=()=>{},pins=[],dragging=false}:BodyViewerProps&{dragging?:boolean}){
 const {scene}=useGLTF(`/models/${sex}.glb?v=${ASSET_VERSION}`);const [map,normal,mask]=useTexture([`/models/skin-albedo.jpg?v=${ASSET_VERSION}`,`/models/skin-normal.png?v=${ASSET_VERSION}`,`/models/body-regions.png?v=${ASSET_VERSION}`]);const pick=useRegionPicker();
 const activeColor=regions.find(r=>r.id===active)?.maskColor[0]||0;
 const material=useMemo(()=>skinMaterial(map,normal,mask,activeColor),[map,normal,mask,activeColor]);
 const {invalidate}=useThree();
 useEffect(()=>{if(dragging||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>{if(!document.hidden)invalidate();},1000/24);return()=>clearInterval(timer);},[dragging,invalidate]);
 useFrame(({clock})=>{if(material.userData.shader&&!dragging)material.userData.shader.uniforms.breathTime.value=clock.elapsedTime;});
 const object=useMemo(()=>{const copy=scene.clone(true);copy.traverse(o=>{if(o instanceof THREE.Mesh){o.material=material;o.castShadow=true;o.receiveShadow=true;}});return copy;},[scene,material]);
 useEffect(()=>()=>{material.dispose();document.body.style.cursor='auto';},[material]);
 const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(e.delta>5||!e.uv)return;const r=pick(e.uv);if(r){const p=e.point.clone();if(e.face)p.add(e.face.normal.clone().transformDirection(e.object.matrixWorld).multiplyScalar(.006));onSelect(r.id,p.toArray() as [number,number,number]);}};
 return <group><primitive object={object} onClick={click} onPointerOver={()=>{document.body.style.cursor='crosshair';}} onPointerOut={()=>{document.body.style.cursor='auto';}}/>{pins.map(p=><Pin key={p.id} pin={p}/>)}</group>;
}
class Boundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function BodyViewer(props:BodyViewerProps){
 const [supported,setSupported]=useState<boolean|null>(null);const [dragging,setDragging]=useState(false);
 useEffect(()=>{const c=document.createElement('canvas');const gl=c.getContext('webgl2');setSupported(!!gl);gl?.getExtension('WEBGL_lose_context')?.loseContext();},[]);
 const fallback=<Fallback2D active={props.active||''} onSelect={props.onSelect||(()=>{})} back={!!props.back}/>;
 if(supported===false)return fallback;
 if(supported===null)return <div className="body-loading">Preparing your body map…</div>;
 return <Boundary fallback={fallback}><Canvas frameloop="demand" dpr={[1,1.75]} shadows camera={{position:[0,.96,3.45],fov:35}} gl={{antialias:true,alpha:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.05}} style={{touchAction:'none'}}><ambientLight intensity={.55}/><hemisphereLight args={['#fff7ed','#8b8b71',.9]}/><directionalLight position={[-3,5,4]} intensity={2.1} color="#ffebda" castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[3,2,2]} intensity={.6} color="#dae6f0"/><directionalLight position={[1,3,-3]} intensity={1.8} color="#ffeedc"/><Suspense fallback={<Loader/>}><Model {...props} dragging={dragging}/><ContactShadows position={[0,-.015,0]} opacity={.25} scale={3} blur={2.8} far={2} resolution={256}/></Suspense><CameraRig back={!!props.back} zoom={props.zoom||1} reset={props.reset||0} active={props.active} mini={props.mini} onDrag={setDragging}/><Quality dragging={dragging}/></Canvas></Boundary>;
}
