'use client';
import { useEffect, useRef } from 'react';
import { ASSET_VERSION } from './assetVersion';
import regions from '@/data/regions.json';
export function useRegionPicker(){
 const pixels=useRef<ImageData|null>(null);
 useEffect(()=>{const image=new Image();image.src=`/models/body-regions.png?v=${ASSET_VERSION}`;image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');if(c){c.drawImage(image,0,0);pixels.current=c.getImageData(0,0,image.width,image.height);}};return()=>{image.onload=null;pixels.current=null;};},[]);
 return (uv:{x:number;y:number})=>{const p=pixels.current;if(!p)return;const x=Math.min(p.width-1,Math.max(0,Math.floor(uv.x*p.width)));const y=Math.min(p.height-1,Math.max(0,Math.floor((1-uv.y)*p.height)));const i=(y*p.width+x)*4;return regions.find(r=>Math.abs(r.maskColor[0]-p.data[i])<3);};
}
