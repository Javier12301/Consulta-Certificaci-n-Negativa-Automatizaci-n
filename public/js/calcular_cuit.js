// --- LÓGICA DE NEGOCIO (Cálculo de CUIT) ---
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
    return String(genderNumber) + String(dni) + String(dv || 0);
};

// --- MANEJO DEL DOM (Interacción Visual) ---

const dniInput = document.getElementById('dni');
const genderSelect = document.getElementById('gender');
const calcButton = document.getElementById('calcButton');
const errorBox = document.getElementById('error');
const resultBox = document.getElementById('result');
const cuitValue = document.getElementById('cuitValue');

// Elementos nuevos del botón (Spinner y Texto)
const btnSpinner = document.getElementById('btnSpinner');
const btnText = document.getElementById('btnText');

// Creamos un contenedor interno para el resultado de ANSES para no borrar el CUIT
const ansesContainer = document.createElement('div');
ansesContainer.style.marginTop = "15px"; 
resultBox.appendChild(ansesContainer);

// Filtro para que solo entren números en el input
dniInput.addEventListener('input', () => {
    dniInput.value = dniInput.value.replace(/\D/g, '').slice(0, 8);
});

// Permitir "Enter" para disparar la consulta
dniInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calcButton.click();
});

calcButton.addEventListener('click', async () => {
    // 1. LIMPIEZA DE ESTADO PREVIO
    errorBox.style.display = 'none';
    resultBox.style.display = 'none';
    ansesContainer.innerHTML = ''; // Limpiamos resultado anterior
    
    const dni = dniInput.value.trim();
    const gender = genderSelect.value;

    // --- INICIO ESTADO DE CARGA ---
    calcButton.disabled = true;              // Bloquear botón
    btnSpinner.style.display = 'block';      // Mostrar ruedita
    btnText.textContent = "Consultando...";  // Cambiar texto
    // ------------------------------

    try {
        // 2. VALIDACIÓN Y CÁLCULO LOCAL
        if (dni.length !== 8) throw new Error('Por favor, ingresá un DNI válido de 8 dígitos.');
        
        const cuit = getCUIT(dni, gender);
        cuitValue.textContent = cuit; // Mostrar CUIT calculado
        resultBox.style.display = 'block'; // Mostrar caja gris

        // 3. PETICIÓN AL SERVIDOR (El momento de espera)
        const response = await fetch('/api/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cuit: cuit, dni: dni, gender: gender })
        });

        const data = await response.json();

        // 4. RENDERIZADO DEL RESULTADO (VERDE / ROJO)
        
        // Título con el nombre del paciente
        const nombreHtml = `
            <div style="border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 8px; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px;">Paciente identificado:</span><br>
                <strong style="font-size: 1rem; color: inherit;">${data.nombre || "Nombre no disponible"}</strong>
            </div>
        `;

        if (data.ok && data.esPosibleEmitir) {
            // --- CASO VERDE (APROBADO) ---
            ansesContainer.innerHTML = `
                <div style="background: #dcfce7; color: #166534; padding: 15px; border-radius: 10px; border: 1px solid #bbf7d0; margin-top: 10px;">
                    ${nombreHtml}
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5rem;">✅</span>
                        <div>
                            <h3 style="margin:0; font-size: 1rem;">Certificación Negativa: SI</h3>
                            <p style="margin:0; font-size: 0.85rem; opacity: 0.9;">No registra cobertura activa.</p>
                        </div>
                    </div>
                </div>
            `;
        } else if (data.ok && !data.esPosibleEmitir) {
            // --- CASO ROJO (RECHAZADO) ---
            const listaErrores = data.mensajes.map(m => `<li>${m}</li>`).join('');
            ansesContainer.innerHTML = `
                <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 10px; border: 1px solid #fecaca; margin-top: 10px;">
                    ${nombreHtml}
                    <div style="display: flex; align-items: start; gap: 10px;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <div style="width: 100%;">
                            <h3 style="margin:0 0 5px 0; font-size: 1rem;">Certificación Negativa: NO</h3>
                            <ul style="margin:0; padding-left: 15px; font-size: 0.85rem; line-height: 1.4;">
                                ${listaErrores || '<li>Registra movimientos en ANSES</li>'}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        } else {
            throw new Error(data.error || "Error desconocido en el servidor.");
        }

    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
    } finally {
        // --- FIN ESTADO DE CARGA (Siempre se ejecuta) ---
        calcButton.disabled = false;             // Habilitar botón
        btnSpinner.style.display = 'none';       // Ocultar ruedita
        btnText.textContent = "Consultar ANSES"; // Restaurar texto original
        // -----------------------------------------------
    }
});