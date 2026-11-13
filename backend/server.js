require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir los archivos estáticos del frontend (index.html, app.js, styles.css)
app.use(express.static(path.join(__dirname, '../frontend')));

// 1. Conexión a la base de datos MySQL (Local o Nube Aiven con SSL)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_PORT && process.env.DB_PORT !== '3306' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10
});

// Inicializar tablas automáticamente en la nube si no existen
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                correo VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS motos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                placa VARCHAR(20) UNIQUE NOT NULL,
                marca VARCHAR(50) NOT NULL,
                modelo VARCHAR(50) NOT NULL,
                kilometraje_actual INT NOT NULL DEFAULT 0,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reglas_mantenimiento (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre_servicio VARCHAR(100) UNIQUE NOT NULL,
                intervalo_km INT NOT NULL,
                descripcion VARCHAR(255)
            )
        `);
        await pool.query(`
            INSERT IGNORE INTO reglas_mantenimiento (id, nombre_servicio, intervalo_km, descripcion) VALUES
            (1, 'Cambio de Aceite', 3000, 'Sustituir aceite de motor y reemplazar filtro de aceite'),
            (2, 'Revisión de Frenos', 6000, 'Revisar desgaste de pastillas, discos y líquido de frenos DOT4'),
            (3, 'Filtro de Aire', 12000, 'Reemplazar filtro de aire para mezcla óptima'),
            (4, 'Kit de Arrastre', 20000, 'Verificar tensión de cadena, lubricación y desgaste de piñones')
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS historial_servicios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                moto_id INT NOT NULL,
                regla_id INT DEFAULT 1,
                kilometraje_servicio INT NOT NULL,
                observaciones VARCHAR(255),
                fecha_servicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (moto_id) REFERENCES motos(id) ON DELETE CASCADE
            )
        `);
        console.log('Base de datos verificada y tablas listas.');
    } catch (err) {
        console.error('Error inicializando BD:', err.message);
    }
}
initDB();

// 2. Configuración de correos (Nodemailer)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 
// RUTAS DE LA API (BACKEND)
// 

// 3. LOGIN (Diferencia entre Mecánico y Piloto)
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;

    try {
        if (correo === 'andres.quinonez.ortiz@gmail.com' && password === 'FelipeOrtiz4190') {
            return res.json({ status: 'success', role: 'mechanic', moto_id: null });
        }

        const [users] = await pool.query(
            "SELECT id FROM usuarios WHERE correo = ? AND password = ?", 
            [correo, password]
        );

        if (users.length > 0) {
            const usuarioId = users[0].id;
            const [motos] = await pool.query("SELECT id FROM motos WHERE usuario_id = ?", [usuarioId]);
            const motoId = motos.length > 0 ? motos[0].id : null;

            return res.json({ status: 'success', role: 'rider', moto_id: motoId });
        } else {
            return res.status(401).json({ status: 'error', message: 'Correo o contraseña incorrectos' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 4. REGISTRAR USUARIO Y MOTO
app.post('/api/registrar', async (req, res) => {
    const { nombre, correo, password, placa, marca, modelo, kilometraje_inicial } = req.body;
    
    try {
        const [resultUser] = await pool.query(
            "INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)",
            [nombre, correo, password]
        );
        
        const [resultMoto] = await pool.query(
            "INSERT INTO motos (usuario_id, placa, marca, modelo, kilometraje_actual) VALUES (?, ?, ?, ?, ?)",
            [resultUser.insertId, placa, marca, modelo, kilometraje_inicial || 0]
        );
        
        res.json({ status: 'success', message: 'Registro completado', moto_id: resultMoto.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ status: 'error', message: 'El correo o la placa ya están registrados.' });
        } else {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }
});

// 5. OBTENER LISTA DE VEHÍCULOS (Para el selector del taller)
app.get('/api/vehiculos', async (req, res) => {
    try {
        const [vehiculos] = await pool.query(`
            SELECT m.id, m.placa, m.marca, m.modelo, m.kilometraje_actual, u.correo 
            FROM motos m 
            JOIN usuarios u ON m.usuario_id = u.id
        `);
        res.json({ status: 'success', vehiculos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 6. ACTUALIZAR KILÓMETROS Y ENVIAR ALERTAS (CON DISEÑO ORIGINAL SIN EMOJIS)
app.post('/api/actualizar-km', async (req, res) => {
    const { moto_id, km_a_sumar } = req.body;

    try {
        await pool.query(
            "UPDATE motos SET kilometraje_actual = kilometraje_actual + ? WHERE id = ?", 
            [km_a_sumar, moto_id]
        );
        
        const [rows] = await pool.query(
            "SELECT m.kilometraje_actual, m.placa, u.correo, u.nombre FROM motos m JOIN usuarios u ON m.usuario_id = u.id WHERE m.id = ?",
            [moto_id]
        );
        
        const vehiculo = rows[0];
        let alertas = [];

        if (vehiculo.kilometraje_actual >= 3000) {
            alertas.push({ 
                servicio: 'Cambio de Aceite', 
                estado: 'Requerido (Superó los 3,000 km)', 
                recomendacion: 'Sustituir aceite de motor según la viscosidad recomendada por el fabricante y reemplazar filtro de aceite.' 
            });
        }
        if (vehiculo.kilometraje_actual >= 6000) {
            alertas.push({ 
                servicio: 'Revisión de Frenos', 
                estado: 'Requerido (Superó los 6,000 km)', 
                recomendacion: 'Revisar el desgaste de las pastillas, discos y nivel de líquido de frenos DOT4.' 
            });
        }
        if (vehiculo.kilometraje_actual >= 12000) {
            alertas.push({ 
                servicio: 'Filtro de Aire', 
                estado: 'Requerido (Superó los 12,000 km)', 
                recomendacion: 'Reemplazar filtro de aire para garantizar una mezcla óptima y mejorar el consumo.' 
            });
        }
        if (vehiculo.kilometraje_actual >= 20000) {
            alertas.push({ 
                servicio: 'Kit de Arrastre', 
                estado: 'Requerido (Superó los 20,000 km)', 
                recomendacion: 'Verificar tensión de cadena, lubricación y desgaste de piñones.' 
            });
        }

        if (alertas.length > 0) {
            let tarjetasHtml = alertas.map(a => `
                <div style="background-color: #fff6f0; border-left: 4px solid #ff6600; border-radius: 6px; padding: 15px 20px; margin-bottom: 15px;">
                    <h3 style="color: #d35400; margin: 0 0 10px 0; font-size: 16px;">${a.servicio}</h3>
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #333;"><strong>Estado del Diagnóstico:</strong> ${a.estado}</p>
                    <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;"><strong>Recomendación Técnica:</strong> ${a.recomendacion}</p>
                </div>
            `).join('');

            const correoHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden;">
                    <div style="height: 6px; background-color: #ff6600;"></div>
                    <div style="padding: 30px;">
                        <h2 style="color: #111111; margin-top: 0; font-size: 22px;">Telemetría MotoCare: Alerta Mantenimiento</h2>
                        <p style="color: #444444; font-size: 14px;">Estimado/a motociclista,</p>
                        <p style="color: #444444; font-size: 14px; line-height: 1.6;">
                            Tu vehículo con placa <strong>${vehiculo.placa}</strong> ha alcanzado un odómetro de 
                            <span style="background-color: #ff6600; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-weight: bold; display: inline-block;">${vehiculo.kilometraje_actual} km</span>.
                        </p>
                        <p style="color: #444444; font-size: 14px; margin-bottom: 20px;">El plan preventivo del sistema ha generado el siguiente reporte de inspección técnica requerida:</p>
                        
                        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
                        
                        ${tarjetasHtml}
                        
                        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
                        
                        <p style="color: #444444; font-size: 14px; line-height: 1.5;">Acércate a un taller autorizado con tu clave de mecánico para actualizar la bitácora del vehículo y reiniciar la alerta.</p>
                        
                        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
                        
                        <p style="color: #888888; font-size: 12px; text-align: center; margin: 0;">Mensaje automático generado por MotoCare Web System. Por favor no responder a este remitente.</p>
                    </div>
                </div>
            `;
            
            transporter.sendMail({
                from: '"MotoCare Alertas" <motocare708@gmail.com>',
                to: vehiculo.correo,
                subject: `Telemetría MotoCare: Alerta Mantenimiento - Placa: ${vehiculo.placa}`,
                html: correoHtml
            }).catch(console.error);
        }
        
        res.json({ status: 'success', kilometraje_actual: vehiculo.kilometraje_actual, alertas });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 7. OBTENER HISTORIAL DE MANTENIMIENTO (BITÁCORA)
app.get('/api/historial', async (req, res) => {
    const { moto_id } = req.query;
    try {
        const [historial] = await pool.query(
            "SELECT observaciones as tipo_servicio, kilometraje_servicio, DATE_FORMAT(fecha_servicio, '%Y-%m-%d') as fecha_servicio FROM historial_servicios WHERE moto_id = ? ORDER BY id DESC", 
            [moto_id]
        );
        res.json({ status: 'success', historial });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 8. REGISTRAR UN NUEVO SERVICIO EN EL TALLER
app.post('/api/registrar-servicio', async (req, res) => {
    const { moto_id, pin_mecanico, tipo_servicio, kilometraje_servicio } = req.body;
    
    if (pin_mecanico !== '1234') {
        return res.status(401).json({ status: 'error', message: 'PIN de mecánico incorrecto.' });
    }

    try {
        await pool.query(
            "INSERT INTO historial_servicios (moto_id, regla_id, kilometraje_servicio, fecha_servicio, observaciones) VALUES (?, 1, ?, NOW(), ?)",
            [moto_id, kilometraje_servicio, tipo_servicio]
        );
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 9. INICIAR EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de MotoCare corriendo en http://localhost:${PORT}`);
});
