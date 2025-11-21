// Probando libreria de detección de genero para cargas masivas de DNI

// Lógica de cálculo de CUIT (Tu función original)
const getCUIT = (dni, gender = 'M') => {
    if (!dni || dni.length !== 8) throw new Error('El DNI debe contener exactamente 8 dígitos');
    let genderNumber = gender === 'M' ? 20 : 27;
    
    const generateDigit = (gNumber) => {
        const multipliers = [2, 3, 4, 5, 6, 7];
        const raw = String(gNumber) + String(dni);
        let total = 0;
        let idx = 0;
        for (let i = raw.length - 1; i >= 0; i--) {
            total += Number(raw[i]) * multipliers[idx];
            idx = (idx === multipliers.length - 1) ? 0 : idx + 1;
        }
        const dv = 11 - (total % 11);
        if (dv === 11) return 0;
        if (dv === 10) return null; // Caso especial
        return dv;
    };

    let dv = generateDigit(genderNumber);
    if (dv === null) {
        // Si falla con 20/27, probamos 23 (caso mixto)
        genderNumber = 23;
        dv = generateDigit(23);
    }
    // Si sigue siendo null (raro), retornamos 0 por defecto o manejamos error
    return String(genderNumber) + String(dni) + String(dv || 0);
};

// --- MANEJO DEL DOM ---

const dniInput = document.getElementById('dni');
const genderSelect = document.getElementById('gender');
const calcButton = document.getElementById('calcButton');
const errorBox = document.getElementById('error');
const resultBox = document.getElementById('result');
const cuitValue = document.getElementById('cuitValue');

// Elemento nuevo para mostrar datos de Anses
const ansesResultBox = document.createElement('div');
ansesResultBox.style.marginTop = "15px";
ansesResultBox.style.display = "none";
document.querySelector('.card').appendChild(ansesResultBox);

dniInput.addEventListener('input', () => {
    dniInput.value = dniInput.value.replace(/\D/g, '').slice(0, 8);
});

calcButton.addEventListener('click', async () => {
    // 1. Resetear UI
    errorBox.style.display = 'none';
    resultBox.style.display = 'none';
    ansesResultBox.style.display = 'none';
    ansesResultBox.innerHTML = '';

    const dni = dniInput.value.trim();
    const gender = genderSelect.value;

    try {
        // 2. Calcular CUIT Localmente
        const cuit = getCUIT(dni, gender);
        cuitValue.textContent = cuit;
        resultBox.style.display = 'block';

        // 3. Consultar al Servidor (Scraping)
        calcButton.disabled = true;
        calcButton.textContent = "Consultando ANSES...";
        
        const response = await fetch('/api/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cuit: cuit, dni: dni, gender: gender })
        });

        const data = await response.json();

        // 4. Mostrar Resultado ANSES
        ansesResultBox.style.display = 'block';
        
        // HTML común para el nombre (lo usamos tanto en verde como en rojo)
        const nombreHtml = `<div style="border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; opacity: 0.8; text-transform: uppercase;">Paciente identificado:</span><br>
            <strong style="font-size: 1.1rem;">${data.nombre}</strong>
        </div>`;

        if (data.ok && data.esPosibleEmitir) {
            // VERDE: No tiene obra social
            ansesResultBox.innerHTML = `
                <div style="background: #dcfce7; color: #166534; padding: 15px; border-radius: 12px; border: 1px solid #bbf7d0;">
                    ${nombreHtml}
                    <h3 style="margin:0 0 5px 0;">✅ Certificación Negativa: SI</h3>
                    <p style="margin:0; font-size: 0.9rem;">El paciente no registra cobertura activa.</p>
                </div>
            `;
        } else if (data.ok && !data.esPosibleEmitir) {
            // ROJO: Tiene obra social
            const listaErrores = data.mensajes.map(m => `<li>${m}</li>`).join('');
            ansesResultBox.innerHTML = `
                <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 12px; border: 1px solid #fecaca;">
                    ${nombreHtml}
                    <h3 style="margin:0 0 5px 0;">⚠️ Certificación Negativa: NO</h3>
                    <p style="margin:0 0 5px 0; font-size: 0.9rem;">Motivos detectados:</p>
                    <ul style="margin:0; padding-left: 20px; font-size: 0.85rem;">
                        ${listaErrores || '<li>Registra movimientos en ANSES</li>'}
                    </ul>
                </div>
            `;
        } else {
            throw new Error(data.error || "Error desconocido");
        }

    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
    } finally {
        calcButton.disabled = false;
        calcButton.textContent = "Calcular CUIT";
    }
});