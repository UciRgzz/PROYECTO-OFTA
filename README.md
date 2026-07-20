# Oftavisión — Sistema de Gestión Médica

Plataforma web fullstack para la gestión integral de una clínica oftalmológica con múltiples sucursales: pacientes, citas, expedientes clínicos, recetas, cirugías y facturación.

## 🚀 Funcionalidades principales

- **Gestión de pacientes**: registro, historial y expedientes clínicos completos.
- **Agenda de citas y cirugías**: control de agendamiento por sucursal y especialista.
- **Formularios clínicos de optometría**: más de 30 campos médicos por ojo (OD/OI), con vistas modales de consulta.
- **Control de accesos por roles**: administrador, médico y recepcionista, con filtros por departamento y sucursal.
- **Facturación**: numeración consecutiva automática mediante triggers en PostgreSQL, con sincronización bidireccional de pagos.
- **Multi-sucursal**: manejo de operaciones independientes por sede.

## 🛠️ Tecnologías

| Categoría | Tecnología |
|---|---|
| Backend | Node.js, Express |
| Base de datos | PostgreSQL (triggers, procedimientos) |
| Frontend | HTML, JavaScript, Bootstrap |
| Despliegue | VPS (Hostinger, Ubuntu), Nginx, PM2 |
| Control de versiones | Git / GitHub, con despliegue continuo |

##  Arquitectura

```
PROYECTO-OFTA/
├── backend/       # Lógica de servidor, conexión a base de datos y APIs
├── frontend/      # Vistas y módulos por rol (admin, login, expedientes, etc.)
├── scripts/       # Scripts de respaldo y utilidades
└── uploads/       # Archivos y documentos generados por el sistema
```

##  Estado

Proyecto en producción, en uso activo por la clínica desde 2025.

##  Autor

**Uciel Martínez** — Desarrollador principal del proyecto.
Estudiante de Ingeniería en Sistemas Computacionales, Universidad de Montemorelos.