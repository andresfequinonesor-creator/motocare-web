// 
// VARIABLES GLOBALES
// 
const estadoActivo = { motoId: null };
let listaVehiculosDB = [];

// 
// 1. LÓGICA DE AUTENTICACIÓN Y ROLES
// 

// Alternar entre Login y Registro
function toggleAuth(view) {
    document.getElementById('loginSection').style.display = view === 'login' ? 'block' : 'none';
    document.getElementById('registerSection').style.display = view === 'register' ? 'block' : 'none';
}

// Iniciar la aplicación y ajustar la vista según el rol
function iniciarApp(rol, motoIdPiloto = null) {
    document.getElementById('authView').style.display = 'none';
    document.getElementById('appView').style.display = 'block';
    
    cargarListaVehiculos().then(() => {
        if (rol === 'mechanic') {
            document.getElementById('sectionServicio').style.display = 'block';
            document.getElementById('selectVehiculosDB').disabled = false;
            document.getElementById('selectVehiculosDB').value = ""; 
            document.getElementById('odometroDisplay').textContent = "00000 km";
            document.getElementById('lblCorreoDisplay').textContent = "-";
        } else {
            document.getElementById('sectionServicio').style.display = 'none';
            document.getElementById('selectVehiculosDB').disabled = true;
            if (motoIdPiloto) {
                document.getElementById('selectVehiculosDB').value = motoIdPiloto;
                seleccionarVehiculoPorId(motoIdPiloto);
            }
        }
    });
}

// Cerrar sesión y volver al menú principal
function cerrarSesion() {
    estadoActivo.motoId = null;
    document.getElementById('appView').style.display = 'none';
    document.getElementById('authView').style.display = 'block';
    document.getElementById('loginForm').reset();
    document.getElementById('registroForm').reset();
    document.getElementById('notificationArea').style.display = 'none';
}

// Evento: Formulario de Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const correo = document.getElementById('loginCorreo').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            iniciarApp(data.role, data.moto_id);
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Error en login:", error));
});

// Evento: Formulario de Registro
document.getElementById('registroForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const datosRegistro = {
        nombre: document.getElementById('regNombre').value,
        correo: document.getElementById('regCorreo').value,
        password: document.getElementById('regPassword').value,
        placa: document.getElementById('regPlaca').value,
        marca: document.getElementById('regMarca').value,
        modelo: document.getElementById('regModelo').value,
        kilometraje_inicial: parseInt(document.getElementById('regKmInicial').value)
    };

    fetch('/api/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosRegistro)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Cuenta creada exitosamente. Iniciando sesión...");
            estadoActivo.motoId = data.moto_id;
            iniciarApp('rider', data.moto_id);
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Error en registro:", error));
});

// 
//  2. CARGA Y SELECCIÓN DE VEHÍCULOS
// 

function cargarListaVehiculos() {
    return fetch('/api/vehiculos')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.vehiculos.length > 0) {
                listaVehiculosDB = data.vehiculos;
                poblarSelectVehiculos(data.vehiculos);
            }
        })
        .catch(error => console.error("Error al cargar vehículos:", error));
}

function poblarSelectVehiculos(vehiculos) {
    const select = document.getElementById('selectVehiculosDB');
    select.innerHTML = '<option value="">Seleccione un vehículo...</option>';
    vehiculos.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.placa} - ${v.marca} ${v.modelo} (${v.kilometraje_actual} km)`;
        select.appendChild(option);
    });
}

document.getElementById('selectVehiculosDB').addEventListener('change', function(e) {
    if (e.target.value) {
        seleccionarVehiculoPorId(e.target.value);
    } else {
        estadoActivo.motoId = null;
        document.getElementById('odometroDisplay').textContent = "00000 km";
        document.getElementById('lblCorreoDisplay').textContent = "-";
        document.getElementById('historyList').innerHTML = "";
    }
});

function seleccionarVehiculoPorId(id) {
    estadoActivo.motoId = id;
    const vehiculo = listaVehiculosDB.find(v => v.id == id);
    if (vehiculo) {
        document.getElementById('odometroDisplay').textContent = String(vehiculo.kilometraje_actual).padStart(5, '0') + " km";
        document.getElementById('lblCorreoDisplay').textContent = vehiculo.correo;
        cargarHistorialAlertas(id);
    }
}

// 
//  3. TELEMETRÍA Y ALERTAS AUTOMÁTICAS
// 

document.getElementById('btnSimular50').addEventListener('click', () => enviarActualizacionKm(50));
document.getElementById('btnSimular1000').addEventListener('click', () => enviarActualizacionKm(1000));

function enviarActualizacionKm(km_a_sumar) {
    if (!estadoActivo.motoId) {
        alert("Por favor, selecciona un vehículo primero.");
        return;
    }

    fetch('/api/actualizar-km', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moto_id: estadoActivo.motoId, km_a_sumar: km_a_sumar })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('odometroDisplay').textContent = String(data.kilometraje_actual).padStart(5, '0') + " km";
            
            const vehiculo = listaVehiculosDB.find(v => v.id == estadoActivo.motoId);
            if (vehiculo) vehiculo.kilometraje_actual = data.kilometraje_actual;

            if (data.alertas && data.alertas.length > 0) {
                mostrarNotificacionUI(data.alertas);
            } else {
                document.getElementById('notificationArea').style.display = 'none';
            }
        } else {
            alert("Error al actualizar kilometraje: " + data.message);
        }
    })
    .catch(error => console.error("Error en telemetría:", error));
}

function mostrarNotificacionUI(alertas) {
    const notifArea = document.getElementById('notificationArea');
    notifArea.style.display = 'block';
    notifArea.innerHTML = "<h3>⚠️ Mantenimiento Requerido</h3>";
    alertas.forEach(a => {
        notifArea.innerHTML += `<p><strong>${a.servicio}:</strong> ${a.estado || a.recomendacion}</p>`;
    });
}

// 
//  4. MÓDULO DE TALLER (BITÁCORA)
// 

function cargarHistorialAlertas(moto_id) {
    fetch('/api/historial?moto_id=' + moto_id)
    .then(res => res.json())
    .then(data => {
        const list = document.getElementById('historyList');
        if (data.status === 'success') {
            list.innerHTML = '';
            if(data.historial.length === 0){
                list.innerHTML = '<p style="color:#aaa;">No hay mantenimientos registrados aún.</p>';
                return;
            }
            data.historial.forEach(item => {
                list.innerHTML += `<div style="background: #333; padding: 10px; margin-bottom: 5px; border-left: 3px solid #ff6600;">
                    <strong>${item.tipo_servicio}</strong> - a los ${item.kilometraje_servicio} km <br>
                    <small style="color:#aaa;">Fecha: ${item.fecha_servicio}</small>
                </div>`;
            });
        }
    }).catch(error => console.error("Error cargando historial:", error));
}

document.getElementById('serviceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!estadoActivo.motoId) {
        alert("Seleccione un vehículo desde el selector superior.");
        return;
    }

    const datosServicio = {
        moto_id: estadoActivo.motoId,
        pin_mecanico: document.getElementById('claveMecanico').value,
        tipo_servicio: document.getElementById('tipoServicio').value,
        kilometraje_servicio: document.getElementById('kmServicio').value
    };

    fetch('/api/registrar-servicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosServicio)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert("Servicio guardado correctamente. Bitácora actualizada.");
            document.getElementById('serviceForm').reset();
            document.getElementById('notificationArea').style.display = 'none';
            cargarHistorialAlertas(estadoActivo.motoId); 
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Error al registrar servicio:", error));
});