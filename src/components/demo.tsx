import { useState } from "react";
import CameraCapture from "./CameraCapture";
import DexieDemo from "./DexieDemo";

const Demo = ()=>{
    const [button,setButton]=useState(true);
    return (
        <>
        <button onClick={()=>setButton((prev)=>!prev)} style={{marginTop:"1rem"}}>{ button ? "Pouchdb Demo":"DexieDemo"}</button>
        { button ? <CameraCapture/>:<DexieDemo/>}
        </>
       
    )

}
export default Demo ;