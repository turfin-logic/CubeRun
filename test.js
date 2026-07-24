const fs=require('fs');
const code=fs.readFileSync('game.js','utf8');
const document={
    getElementById:()=>({style:{},classList:{add:()=>{},remove:()=>{}}, textContent:'', getContext:()=>({
        clearRect:()=>{}, fillRect:()=>{}, strokeRect:()=>{}, beginPath:()=>{},
        moveTo:()=>{}, lineTo:()=>{}, stroke:()=>{}, fill:()=>{}, arc:()=>{},
        measureText:()=>({width:10}), fillText:()=>{}, setTransform:()=>{}
    })}),
    querySelector:()=>({style:{}}),
    createElement:()=>({style:{}, getContext:()=>({
        clearRect:()=>{}, fillRect:()=>{}, strokeRect:()=>{}, beginPath:()=>{},
        moveTo:()=>{}, lineTo:()=>{}, stroke:()=>{}, fill:()=>{}, arc:()=>{},
        measureText:()=>({width:10}), fillText:()=>{}, setTransform:()=>{}
    })})
};
const window={innerWidth:800,innerHeight:600,addEventListener:()=>{},requestAnimationFrame:()=>{},performance:{now:()=>0}};
const Image=class{constructor(){this.src='';}};
const Audio=class{constructor(){this.src='';}};
try {
    eval(code);
    console.log('Parsed successfully');
    update(0.016);
    update(0.016);
    draw();
    console.log('Update and Draw run fine');
} catch (e) {
    console.error(e);
}
