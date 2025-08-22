document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recoveryForm');
    const emailInput = document.getElementById('email');
    const mensagem = document.getElementById('mensagem');
    const submitButton = form.querySelector('button[type="submit"]');

    const setLoading = (loading) => {
        submitButton.disabled = loading;
        submitButton.textContent = loading ? 'Enviando...' : 'Enviar instruções';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensagem.textContent=''; mensagem.className='message';

        const email=emailInput.value.trim();
        const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!email||!emailRegex.test(email)){
            mensagem.textContent='Por favor, insira um e-mail válido.';
            mensagem.classList.add('error');
            return;
        }

        setLoading(true);
        try{
            const res=await fetch('http://localhost:3000/auth/recuperar-senha',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({email})
            });
            const data=await res.json();
            if(!res.ok) throw new Error(data.message||'Erro ao solicitar recuperação.');
            mensagem.textContent='✅ Verifique seu e-mail para continuar a recuperação.';
            mensagem.classList.add('success');
            emailInput.value='';
        }catch(err){
            mensagem.textContent=`❌ ${err.message}`;
            mensagem.classList.add('error');
        }finally{setLoading(false);}
    });
});
