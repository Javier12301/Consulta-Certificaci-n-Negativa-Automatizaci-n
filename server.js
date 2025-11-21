const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cuit.html'));
});

app.post('/api/consultar', async (req, res) => {
    const { cuit } = req.body; // Recibimos el CUIT ya calculado del front

    try {
        console.log(`Consultando CUIT: ${cuit}`);

        // Separamos el CUIT en las 3 partes
        const cuitPre = cuit.substring(0, 2);
        const cuitDoc = cuit.substring(2, 10);
        const cuitDV = cuit.substring(10, 11);

        const browser = await puppeteer.launch({
            headless: true, // Déjalo en false para ver si escribe bien esta vez
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        
        // DISFRAZ PARA ROBOT
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
        // Vamos a ANSES
        await page.goto('https://servicioswww.anses.gob.ar/censite/index.aspx', { waitUntil: 'networkidle2' });

        // --- AQUÍ USAMOS TUS SELECTORES EXACTOS ---
        // Usamos el selector de ID (#) o Name ([name=])
        // Como dijiste que son names, usaremos selectores de atributo name
        
        // Esperamos a que aparezca el primer input
        await page.waitForSelector('[name$="txtCuitPre"]');

        // Escribimos (Notar que ahora dice CUIT con T)
        await page.type('[name$="txtCuitPre"]', cuitPre);
        await page.type('[name$="txtCuitDoc"]', cuitDoc);
        await page.type('[name$="txtCuitDV"]', cuitDV);

        // Hacemos click en el botón Verificar
        // Usamos name$="btnVerificar" por si tiene algún prefijo ASP.NET
        await Promise.all([
            page.click('[name$="btnVerificar"]'), 
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        // --- ANÁLISIS DEL RESULTADO ---
        // 1. Extraer el NOMBRE del paciente
        let nombrePaciente = "No encontrado";
        try {
            // Buscamos el elemento que termina en lblApellidoNombre
            nombrePaciente = await page.$eval('[id$="lblNombre"]', el => el.innerText.trim());
        } catch (e) {
            console.log("No se pudo extraer el nombre (puede que el selector haya cambiado).");
        }

        const contenido = await page.content();
        
        // 2. Verificar si es posible emitir
        const esPosible = contenido.includes("Es posible emitir la Certificación");
        
        let resultado = {
            ok: true,
            nombre: nombrePaciente, // <--- Enviamos el nombre al frontend
            esPosibleEmitir: esPosible,
            mensajes: []
        };
        
        if (!esPosible) {
            // Extraer errores en rojo
            resultado.mensajes = await page.evaluate(() => {
                const elementos = document.querySelectorAll('span[style*="color:Red"], .rojo, font[color="Red"]');
                return Array.from(elementos)
                    .map(e => e.innerText.trim())
                    .filter(t => t.length > 5);
            });
        }

        await browser.close();
        res.json(resultado);

    } catch (error) {
        console.error("Error en Puppeteer:", error);
        res.status(500).json({ ok: false, error: "Error al procesar en ANSES" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));