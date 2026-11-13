#  MotoCare Web

Aplicación web para la gestión del mantenimiento preventivo de motocicletas, control de odómetro, historial de servicios en taller y envío automático de alertas técnicas por correo electrónico.

**Aplicación en producción:** [https://motocare-web.onrender.com](https://motocare-web.onrender.com)

---

##  Equipo de Desarrollo
* **Andrés Felipe Quiñones Ortiz**
* **Javier Santiago Espinel Barrero**
* **Luis Daniel Corredor**

**Asignatura:** Desarrollo de Aplicaciones Web (4BML)  
**Docente:** Hernán Darío Cruz Enciso  
**Institución:** Universidad ECCI — Bogotá D.C., 2026

---

##  Arquitectura y Tecnologías

| Capa | Tecnología | Descripción |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript | Interfaz responsiva con vistas diferenciadas para Piloto y Taller. |
| **Backend** | Node.js + Express.js | API RESTful para autenticación, control de kilometraje, bitácora y alertas. |
| **Base de Datos** | MySQL 8 (Aiven Cloud) | Persistencia relacional en la nube con conexión cifrada SSL (`mysql2`). |
| **Notificaciones** | Brevo Email API (v3) | Envío automatizado de reportes técnicos en HTML mediante HTTPS. |
| **Alojamiento** | Render | Despliegue continuo en la nube desde repositorio GitHub. |

---

##  Funcionalidades Principales

1. **Registro y Autenticación por Roles:**
   * **Piloto (`rider`):** Registro de cuenta y motocicleta (placa, marca, modelo y kilometraje inicial), actualización de odómetro y consulta de historial.
   * **Mecánico (`mechanic`):** Acceso al panel de taller y registro de servicios realizados en bitácora mediante validación con PIN de taller.
2. **Motor de Alertas Preventivas:**
   * Evaluación automática de umbrales de kilometraje:
     * **3,000 km:** Cambio de Aceite
     * **6,000 km:** Revisión de Frenos
     * **12,000 km:** Filtro de Aire
     * **20,000 km:** Kit de Arrastre
3. **Notificaciones Transaccionales:**
   * Envío automático de correo electrónico personalizado con el diagnóstico y recomendaciones técnicas cada vez que el odómetro supera un umbral.

---

##  Instalación y Ejecución Local

### Requisitos previos
* [Node.js](https://nodejs.org/) (v18 o superior)
* Acceso a una base de datos **MySQL** (local o instancia en Aiven)
* Cuenta y clave API v3 de **Brevo**

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/andresfequinonesor-creator/motocare-web.git](https://github.com/andresfequinonesor-creator/motocare-web.git)
   cd motocare-web
