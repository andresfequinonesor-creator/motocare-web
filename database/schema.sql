SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Estructura de tabla para la tabla `historial_servicios`
CREATE TABLE `historial_servicios` (
  `id` int(11) NOT NULL,
  `moto_id` int(11) NOT NULL,
  `regla_id` int(11) NOT NULL,
  `kilometraje_servicio` int(11) NOT NULL,
  `fecha_servicio` datetime DEFAULT current_timestamp(),
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura de tabla para la tabla `motos`
CREATE TABLE `motos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `placa` varchar(10) NOT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(50) NOT NULL,
  `kilometraje_actual` int(11) NOT NULL DEFAULT 0,
  `fecha_actualizacion` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura de tabla para la tabla `reglas_mantenimiento`
CREATE TABLE `reglas_mantenimiento` (
  `id` int(11) NOT NULL,
  `nombre_servicio` varchar(100) NOT NULL,
  `intervalo_km` int(11) NOT NULL,
  `margen_alerta_km` int(11) NOT NULL DEFAULT 200,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura de tabla para la tabla `usuarios`
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices y Claves Foráneas
ALTER TABLE `historial_servicios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `moto_id` (`moto_id`),
  ADD KEY `regla_id` (`regla_id`);

ALTER TABLE `motos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `placa` (`placa`),
  ADD KEY `usuario_id` (`usuario_id`);

ALTER TABLE `reglas_mantenimiento`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`);

ALTER TABLE `historial_servicios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `motos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `reglas_mantenimiento`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `historial_servicios`
  ADD CONSTRAINT `historial_servicios_ibfk_1` FOREIGN KEY (`moto_id`) REFERENCES `motos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_servicios_ibfk_2` FOREIGN KEY (`regla_id`) REFERENCES `reglas_mantenimiento` (`id`);

ALTER TABLE `motos`
  ADD CONSTRAINT `motos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

COMMIT;