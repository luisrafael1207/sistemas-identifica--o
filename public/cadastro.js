document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado.');
        window.location.href = 'login.html';
        return;
    }

    const video = document.getElementById('cameraStream');
    const preview = document.getElementById('preview');
    const abrirCamera = document.getElementById('abrirCamera');
    const capturarFoto = document.getElementById('capturarFoto');
    const pararCamera = document.getElementById('pararCamera');
    const resetarFoto = document.getElementById('resetarFoto');
    const fotoInput = document.getElementById('foto');
    const cadastroForm = document.getElementById('cadastroForm');
    const spinner = document.getElementById('spinner');

    let stream = null;
    let fotoBlob = null;

    const atualizarBotoes = (estado) => {
        abrirCamera.style.display = estado==='cameraAberta'||estado==='inicial' ? 'inline-block':'none';
        capturarFoto.style.display = estado==='cameraAberta' ? 'inline-block':'none';
        pararCamera.style.display = estado==='cameraAberta' ? 'inline-block':'none';
        resetarFoto.style.display = estado==='fotoCapturada' ? 'inline-block':'none';
        video.style.display = estado==='cameraAberta' ? 'block':'none';
        preview.style.display = estado==='fotoCapturada' ? 'block':'none';
    };

    atualizarBotoes('inicial');

    abrirCamera.addEventListener('click', async () => {
        try {
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                atualizarBotoes('cameraAberta');
            }
        } catch {
            alert('Não foi possível acessar a câmera.');
        }
    });

    capturarFoto.addEventListener('click', () => {
        if (!stream) return alert('Abra a câmera antes de capturar a foto!');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
        canvas.toBlob((blob)=>{
            fotoBlob = blob;
            preview.src = URL.createObjectURL(blob);
            stream.getTracks().forEach(track=>track.stop());
            stream=null;
            video.srcObject=null;
            atualizarBotoes('fotoCapturada');
        },'image/jpeg');
    });

    pararCamera.addEventListener('click', () => {
        if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
        video.srcObject=null;
        atualizarBotoes('inicial');
    });

    resetarFoto.addEventListener('click', () => {
        fotoBlob=null; preview.src=''; fotoInput.value='';
        atualizarBotoes('inicial');
    });

    fotoInput.addEventListener('change', ()=>{
        if(fotoInput.files.length>0){
            fotoBlob=fotoInput.files[0];
            preview.src=URL.createObjectURL(fotoBlob);
            preview.style.display='block';
            video.style.display='none';
            atualizarBotoes('fotoCapturada');
        }
    });

    cadastroForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        spinner.style.display='inline-block';
        try{
            const formData=new FormData(cadastroForm);
            if(fotoBlob) formData.set('foto',fotoBlob,'foto.jpg');
            const res = await fetch('http://localhost:3000/estudantes',{
                method:'POST',
                headers:{Authorization:`Bearer ${token}`},
                body: formData
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || 'Erro ao cadastrar estudante');
            alert('Estudante cadastrado com sucesso!');
            window.location.href='listar.html';
        }catch(err){
            alert(err.message || 'Erro desconhecido');
        }finally{
            spinner.style.display='none';
        }
    });
});
