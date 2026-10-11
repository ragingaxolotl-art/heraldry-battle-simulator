/* Capture only the visible map from a user-approved current-tab stream. */
const captureButton=document.getElementById('settlementCapture');
captureButton.addEventListener('click',async()=>{
  const status=document.getElementById('settlementCaptureStatus');
  if(!navigator.mediaDevices?.getDisplayMedia){status.textContent='Tab capture is unavailable here. Open this website in desktop Chrome or Edge, or use the alternative PNG option below.';return;}
  const city={...selectedSettlement()},country={...activeAtlasCountry()};
  const preview=document.querySelector('.settlement-preview'),oldScroll=[scrollX,scrollY];
  let stream,video,marker;
  captureButton.disabled=true;
  try{
    status.textContent='Choose This Tab (the Kingdoms at War website), then Share. No audio is captured.';
    // Must be called directly from the click, before any awaited work.
    stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'},audio:false,preferCurrentTab:true,selfBrowserSurface:'include',monitorTypeSurfaces:'exclude',surfaceSwitching:'exclude'});
    const track=stream.getVideoTracks()[0];
    if(track.getSettings().displaySurface!=='browser')throw Error('Choose a browser tab, not a window or entire screen. Please try again.');
    document.body.classList.add('capturing-settlement');
    preview.scrollIntoView({block:'center',behavior:'instant'});
    // A temporary color strip verifies that the shared tab is this page, and that
    // viewport-to-video coordinates match. It is outside the downloaded crop.
    marker=document.createElement('div');marker.className='capture-tab-marker';marker.setAttribute('aria-hidden','true');
    const colors=Array.from({length:6},()=>Array.from(crypto.getRandomValues(new Uint8Array(3)),n=>40+n%170));
    colors.forEach(rgb=>{const swatch=document.createElement('span');swatch.style.background=`rgb(${rgb.join(',')})`;marker.append(swatch);});document.body.append(marker);
    video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;
    await Promise.race([video.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Capture did not start. Please try again.')),8000))]);
    status.textContent='Capturing your map…';
    const frame=document.createElement('canvas'),ctx=frame.getContext('2d',{willReadFrequently:true});
    let verified=false;
    // Allow the embedded map to redraw at the fitted size and the stream to deliver it.
    await new Promise(resolve=>setTimeout(resolve,1200));
    for(let attempt=0;attempt<12;attempt++){
      if(track.readyState==='ended')throw Error('Sharing stopped before the map was captured. Please try again.');
      if(video.videoWidth&&video.videoHeight){
        frame.width=video.videoWidth;frame.height=video.videoHeight;ctx.drawImage(video,0,0);
        const sx=frame.width/innerWidth,sy=frame.height/innerHeight;
        verified=colors.every((rgb,i)=>{const pixel=ctx.getImageData(Math.floor((12+i*16)*sx),Math.floor(12*sy),1,1).data;return rgb.every((n,k)=>Math.abs(n-pixel[k])<24);});
        if(verified)break;
      }
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(!verified)throw Error('We could not verify this tab. Please select the Kingdoms at War tab and keep it visible while capturing.');
    const rect=preview.getBoundingClientRect(),sx=frame.width/innerWidth,sy=frame.height/innerHeight;
    if(rect.left<0||rect.top<24||rect.right>innerWidth||rect.bottom>innerHeight)throw Error('The map does not fit on screen. Make the browser window larger and try again.');
    if(selectedSettlement().id!==city.id)throw Error('The selected settlement changed. Please capture again.');
    const crop=document.createElement('canvas');crop.width=Math.round((rect.width-2)*sx);crop.height=Math.round((rect.height-2)*sy);
    crop.getContext('2d').drawImage(frame,(rect.left+1)*sx,(rect.top+1)*sy,(rect.width-2)*sx,(rect.height-2)*sy,0,0,crop.width,crop.height);
    // Stop sharing immediately after the single frame, before captioning or downloading.
    stream.getTracks().forEach(t=>t.stop());frame.width=frame.height=0;
    const blob=await new Promise(resolve=>crop.toBlob(resolve,'image/png'));if(!blob)throw Error('The map image could not be created. Please try again.');
    await exportSettlementCaption(blob,city,country);
    status.textContent=`Downloaded ${city.name}’s map with its information underneath. Sharing has stopped.`;
  }catch(error){status.textContent=error.name==='NotAllowedError'?'Capture canceled or blocked. Nothing was downloaded. Try again and choose This Tab, or use the alternative PNG option.':error.message;}
  finally{
    stream?.getTracks().forEach(t=>t.stop());if(video){video.pause();video.srcObject=null;}marker?.remove();
    document.body.classList.remove('capturing-settlement');window.scrollTo({left:oldScroll[0],top:oldScroll[1],behavior:'instant'});captureButton.disabled=false;
  }
});
