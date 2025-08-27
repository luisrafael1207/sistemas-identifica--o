document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Você precisa estar logado.");
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const estudanteId = urlParams.get('id');
    if (!estudanteId) { alert("ID do estudante não encontrado."); return; }

    // ELEMENTOS
    const logoutBtn = document.getElementById('logoutBtn');
    const editarForm = document.getElementById('editarForm');
    const video = document.getElementById('cameraStream');
    const preview = document.getElementById('preview');
    const abrirCamera = document.getElementById('abrirCamera');
    const capturarFoto = document.getElementById('capturarFoto');
    const pararCamera = document.getElementById('pararCamera');
    const resetarFoto = document.getElementById('resetarFoto');
    const fotoInput = document.getElementById('foto');

    let stream = null;
    let fotoBlob = null;

    const mostrarToast = (msg, tipo="sucesso") => {
        const toast = document.createElement("div");
        toast.textContent = msg;
        toast.style = `
            position: fixed; bottom:20px; right:20px;
            background: ${tipo==="erro"?"#e74c3c":"#4caf50"};
            color:white; padding:12px 20px; border-radius:5px;
            box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:10000;
            opacity:0; transition:opacity 0.5s;
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(()=>toast.style.opacity="1");
        setTimeout(()=>{ toast.style.opacity="0"; setTimeout(()=>toast.remove(),500); },3000);
    };

    const criarSpinnerGlobal = () => {
        if (!document.getElementById("spinnerGlobal")) {
            const spinner = document.createElement("div");
            spinner.id = "spinnerGlobal";
            spinner.style = `
                position: fixed; top:0; left:0; width:100%; height:100%;
                background: rgba(0,0,0,0.4); display:flex;
                justify-content:center; align-items:center; z-index:9999;
            `;
            spinner.innerHTML = `<div style="
                border:4px solid #fff; border-top:4px solid #4caf50;
                border-radius:50%; width:50px; height:50px;
                animation: spinGlobal 1s linear infinite;"></div>`;
            document.body.appendChild(spinner);
            const style = document.createElement("style");
            style.innerHTML = `@keyframes spinGlobal {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`;
            document.head.appendChild(style);
        }
    };
    const removerSpinnerGlobal = () => { const s = document.getElementById("spinnerGlobal"); if(s)s.remove(); };

    const atualizarBotoes = (estado) => {
        abrirCamera.style.display = estado==='cameraAberta'||estado==='inicial'?'inline-block':'none';
        capturarFoto.style.display = estado==='cameraAberta'?'inline-block':'none';
        pararCamera.style.display = estado==='cameraAberta'?'inline-block':'none';
        resetarFoto.style.display = estado==='fotoCapturada'?'inline-block':'none';
        video.style.display = estado==='cameraAberta'?'block':'none';
        preview.style.display = estado==='fotoCapturada'||preview.src?'block':'none';
    };
    atualizarBotoes('inicial');

    // CAMERA
    abrirCamera.addEventListener('click', async ()=>{
        if(!stream){ 
            stream = await navigator.mediaDevices.getUserMedia({video:true}); 
            video.srcObject = stream; 
            atualizarBotoes('cameraAberta'); 
        }
    });
    capturarFoto.addEventListener('click', ()=>{
        if(!stream){ mostrarToast("Abra a câmera antes!","erro"); return; }
        const canvas = document.createElement('canvas'); 
        canvas.width = video.videoWidth || 320; 
        canvas.height = video.videoHeight || 240;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            fotoBlob = blob; 
            preview.src = URL.createObjectURL(blob); 
            stream.getTracks().forEach(t => t.stop()); 
            stream = null; 
            video.srcObject = null; 
            atualizarBotoes('fotoCapturada'); 
        }, 'image/jpeg');
    });
    pararCamera.addEventListener('click', ()=>{ 
        if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } 
        video.srcObject = null; 
        atualizarBotoes('inicial'); 
    });
    resetarFoto.addEventListener('click', ()=>{ 
        fotoBlob=null; preview.src=''; fotoInput.value=''; 
        atualizarBotoes('inicial'); 
    });
    fotoInput.addEventListener('change', ()=>{
        if(fotoInput.files.length>0){ 
            fotoBlob = fotoInput.files[0]; 
            preview.src = URL.createObjectURL(fotoBlob); 
            preview.style.display='block'; video.style.display='none'; 
            atualizarBotoes('fotoCapturada'); 
        }
    });

    // CARREGAR ESTUDANTE
    const carregarEstudante = async ()=>{
        criarSpinnerGlobal();
        try{
            const res = await fetch(`http://localhost:3000/estudantes/${estudanteId}`, { headers:{ Authorization:`Bearer ${token}` } });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || "Erro ao buscar estudante");
            document.getElementById('nome').value = data.nome || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('turma').value = data.turma || '';
            document.getElementById('telefone').value = data.telefone || '';
            if(data.fotoUrl){ 
                preview.src = `${data.fotoUrl}?t=${new Date().getTime()}`; 
                preview.style.display='block'; 
            }
        }catch(err){ mostrarToast(err.message,"erro"); }
        finally{ removerSpinnerGlobal(); }
    };
    carregarEstudante();

    // SUBMIT FORM
    editarForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const btn = editarForm.querySelector('button[type="submit"]'); 
        btn.disabled = true;
        criarSpinnerGlobal();
        const formData = new FormData(editarForm); 
        if(fotoBlob) formData.set('foto', fotoBlob, 'foto.jpg');

        try{
            const res = await fetch(`http://localhost:3000/estudantes/${estudanteId}`, { 
                method: 'PUT', 
                headers: { Authorization:`Bearer ${token}` }, 
                body: formData 
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || "Erro ao atualizar estudante");
            mostrarToast("Estudante atualizado com sucesso!");
            // Redirecionamento automático
            setTimeout(()=> window.location.href='listar.html', 1500);
        }catch(err){ mostrarToast(err.message,"erro"); }
        finally{ btn.disabled=false; removerSpinnerGlobal(); }
    });

    // LOGOUT
    logoutBtn.addEventListener('click', ()=>{
        localStorage.removeItem('token');
        window.location.href='login.html';
    });
});
