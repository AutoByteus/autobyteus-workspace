import { controls } from './stores';
export default { post:async(path:string,body:FormData)=>{controls.events.push('Upload '+path);await new Promise(r=>setTimeout(r,1200));if(controls.failUpload)throw new Error('Disposable upload failure.');return {data:{fileUrl:URL.createObjectURL(body.get('file') as File)}}} };
