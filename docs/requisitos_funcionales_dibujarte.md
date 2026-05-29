# Requisitos Funcionales — Sistema de Inventario Dibujarte

---

## 1. Introducción

### 1.1 Nombre del Proyecto

Sistema Web de Inventario Dibujarte

### 1.2 Descripción General

El sistema Dibujarte es una aplicación web diseñada para gestionar el inventario detallado de compra y venta de múltiples empresas. La plataforma permitirá administrar productos, controlar stock, registrar retiros, visualizar métricas importantes del negocio y gestionar usuarios con diferentes niveles de permisos.

El sistema estará diseñado bajo una arquitectura multiempresa, garantizando el aislamiento total de la información entre compañías.

---

## 2. Objetivos del Sistema

### 2.1 Objetivo General

Desarrollar una plataforma web moderna para la gestión integral del inventario y ventas de la empresa Dibujarte.

### 2.2 Objetivos Específicos

- Administrar productos y stock.
- Controlar entradas y retiros de inventario.
- Visualizar indicadores KPI del negocio.
- Gestionar usuarios y permisos.
- Notificar productos con bajo stock.
- Facilitar la administración multiempresa.
- Centralizar información comercial y operativa.

---

## 3. Requisitos Funcionales

### RF-01 — Sistema de Autenticación

#### RF-01.1 Login

El sistema debe contar con un formulario de inicio de sesión mediante:

- Correo electrónico.
- Contraseña.

#### RF-01.2 Recuperación de Contraseña

El sistema debe permitir recuperar la contraseña mediante correo electrónico.

**Flujo:**

1. El usuario ingresa su correo.
2. El sistema valida el usuario.
3. El sistema envía un enlace de recuperación.
4. El usuario podrá establecer una nueva contraseña.

---

### RF-02 — Landing Page

#### RF-02.1 Hero Principal

La landing page debe contener:

- Descripción de la empresa.
- Texto comercial.
- Imagen o banner principal.
- Formularios de login integrados en el hero.

#### RF-02.2 Sección de Productos

La landing debe mostrar cards de productos vendidos por la empresa.

Cada card debe incluir:

- Imagen.
- Nombre.
- Breve descripción.
- Precio opcional.

Estas cards deben ser administrables desde el panel administrativo.

#### RF-02.3 Trayectoria Empresarial

El sistema debe mostrar:

- Empresas con las que se ha trabajado.
- Experiencia.
- Trayectoria comercial.

#### RF-02.4 Contacto

La landing debe tener:

- Formulario de contacto.
- Correo empresarial.
- Número telefónico.
- Redes sociales.

---

### RF-04 — Roles y Permisos

#### RF-04.1 Roles

El sistema debe permitir crear diferentes roles:

- Administrador.
- Operativo.

#### RF-04.2 Gestión de Permisos

El administrador debe poder asignar permisos específicos a cada usuario.

**Ejemplos:**

- Ver inventario.
- Crear productos.
- Editar productos.
- Eliminar productos.
- Gestionar usuarios.
- Ver dashboard.

---

### RF-05 — Sidebar de Navegación

El sistema debe tener un sidebar lateral para navegar entre módulos.

El sidebar debe incluir:

- Dashboard.
- Inventario.
- Configuración.
- Usuarios.
- Landing Administrativa.
- Cerrar sesión.

---

### RF-06 — Dashboard

#### RF-06.1 KPIs del Sistema

El dashboard debe mostrar indicadores importantes:

**KPI 1 — Total de Inventario**
Cantidad total de productos registrados.

**KPI 2 — Valor Total del Inventario**
Valor monetario total del stock disponible.

**KPI 3 — Productos Bajos de Stock**
Listado y cantidad de productos que estén en stock mínimo.

**KPI 4 — Deuda de Vendedores**
Total de productos pendientes de pago.

**KPI 5 — Ventas Mensuales**
Total monetario de ventas realizadas durante el mes.

#### RF-06.2 Buscador del Dashboard

El dashboard debe incluir un buscador de productos por:

- Nombre.
- Número de referencia.
- Precio.
- Gramaje.

#### RF-06.3 Filtros de Búsqueda

El buscador debe permitir:

- Filtrar por rango de precio.
- Filtrar por stock.
- Filtrar por proveedor.
- Filtrar por disponibilidad.

---

### RF-07 — Módulo de Inventario

#### RF-07.1 CRUD de Productos

El sistema debe permitir:

- Crear productos.
- Leer productos.
- Editar productos.
- Eliminar productos.

#### RF-07.2 Buscador de Productos

El módulo de inventario debe permitir búsqueda por:

- Nombre.
- Referencia.
- Precio.
- Gramaje.

#### RF-07.3 Filtros

Debe incluir filtros avanzados de búsqueda.

---

### RF-08 — Creación de Productos

#### RF-08.1 Botón Crear Producto

En el módulo de inventario debe existir un botón **"Crear Producto"**.

Al presionarlo debe abrirse una ventana modal con formulario.

#### RF-08.2 Formulario de Creación

El formulario debe solicitar:

1. Foto del producto.
2. Nombre del producto.
3. Referencia SKU automática.
4. Número de stock.
5. Número de stock mínimo.
6. Precio del producto.
7. Costo del producto.
8. Proveedor (opcional).

#### RF-08.3 Generación Automática de SKU

El sistema debe generar automáticamente un SKU:

- De 12 caracteres.
- Formato: `XXX-XXX-XXX`

**Ejemplo:** `A12-B45-C78`

El SKU:

- Debe ser único.
- No debe poder editarse.

---

### RF-09 — Retiro de Stock

#### RF-09.1 Botón Retiro de Stock

Cada producto debe tener un botón **"Retiro de Stock"**.

Al presionarlo debe abrir una modal.

#### RF-09.2 Formulario de Retiro

La modal debe solicitar:

1. Producto a retirar.
2. Cantidad.
3. Nombre de la persona.
4. Correo electrónico.
5. Tipo de entrega:
   - Producto pagado.
   - Producto por pagar.

#### RF-09.3 Productos por Pagar

Si el usuario selecciona **"Producto por pagar"**, el sistema debe mostrar:

- Valor pendiente.
- Campo de observaciones.

#### RF-09.4 Actualización de Stock

Al confirmar el retiro, el sistema debe descontar automáticamente el stock.

#### RF-09.5 Envío de Correo

Toda la información del retiro debe enviarse automáticamente al correo de la persona registrada.

El correo debe enviarse desde: `eldice16@gmail.com`

El correo debe incluir:

- Producto.
- Cantidad.
- Valor pendiente.
- Observaciones.
- Fecha de entrega.

---

### RF-10 — Listado de Productos

#### RF-10.1 Visualización

Los productos deben mostrarse en cards horizontales.

Cada card debe contener:

- Imagen miniatura.
- Nombre.
- Stock.
- Botones de acción.

#### RF-10.2 Botones de Acción

Cada producto debe tener:

- Ver detalles.
- Editar.
- Eliminar.

---

### RF-11 — Detalles del Producto

#### RF-11.1 Vista Detallada

Al presionar **"Ver detalles"** se debe visualizar:

- Nombre.
- Referencia SKU.
- Imagen.
- Stock.
- Stock mínimo.
- Precio.
- Costo.
- Proveedor.

---

### RF-12 — Edición de Productos

#### RF-12.1 Modificación

El sistema debe permitir editar:

- Nombre.
- Imagen.
- Stock.
- Stock mínimo.
- Precio.
- Costo.
- Proveedor.

#### RF-12.2 Restricción SKU

El SKU no debe poder modificarse.

---

### RF-13 — Gestión de Usuarios

#### RF-13.1 CRUD de Usuarios

El administrador debe poder:

- Crear usuarios.
- Editar usuarios.
- Eliminar usuarios.
- Visualizar usuarios.

#### RF-13.2 Asignación de Permisos

Al crear o editar un usuario, el administrador debe poder seleccionar permisos específicos.

---

### RF-14 — Notificaciones

#### RF-14.1 Stock Mínimo

El sistema debe detectar automáticamente cuando un producto alcance el stock mínimo.

#### RF-14.2 Campana de Notificaciones

El sistema debe mostrar una notificación mediante un ícono de campana.

La notificación debe indicar:

- Nombre del producto.
- Cantidad restante.
- Estado crítico.

---

## 4. Requisitos No Funcionales

**RNF-01 Seguridad**
- Contraseñas cifradas.
- Uso de JWT o sesiones seguras.
- Protección contra accesos no autorizados.

**RNF-02 Rendimiento**
- El sistema debe responder en menos de 3 segundos.
- Las búsquedas deben ser rápidas y optimizadas.

**RNF-03 Responsive**

La plataforma debe funcionar correctamente en:

- Desktop.
- Tablet.
- Mobile.

**RNF-04 Escalabilidad**

El sistema debe permitir:

- Escalar módulos.
- Agregar nuevas funcionalidades.

**RNF-05 Disponibilidad**

El sistema debe tener disponibilidad mínima del 99%.

---

## 5. Conclusión

El sistema Dibujarte busca optimizar la gestión de inventario y ventas mediante una plataforma moderna, segura y escalable, permitiendo un control completo del stock, usuarios, retiros y métricas comerciales.
