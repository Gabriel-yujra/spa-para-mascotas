--
-- PostgreSQL database dump
--

\restrict ABCYeIHM6Vtng1PEgszM67LlGf4ghp8r4gD25uJx06PA9wZOId9qYSNgDbWkeft

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id_log uuid DEFAULT gen_random_uuid() NOT NULL,
    id_usuario uuid,
    accion text NOT NULL,
    detalle text,
    ip_address text,
    user_agent text,
    fecha timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: bloqueos_agenda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bloqueos_agenda (
    id_bloqueo uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date NOT NULL,
    motivo text,
    tipo text NOT NULL,
    id_trabajador uuid
);


ALTER TABLE public.bloqueos_agenda OWNER TO postgres;

--
-- Name: cajas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cajas (
    id_caja uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    estado text DEFAULT 'activa'::text NOT NULL,
    saldo_actual numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.cajas OWNER TO postgres;

--
-- Name: checklist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklist_items (
    id_item uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text
);


ALTER TABLE public.checklist_items OWNER TO postgres;

--
-- Name: cita_movimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cita_movimientos (
    id_movimiento uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cita uuid NOT NULL,
    tipo_movimiento text NOT NULL,
    fecha_anterior date,
    fecha_nueva date NOT NULL,
    id_usuario_origen uuid NOT NULL,
    descripcion text,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cita_movimientos OWNER TO postgres;

--
-- Name: cita_trabajadores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cita_trabajadores (
    id_cita_trabajador uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cita uuid NOT NULL,
    id_trabajador uuid NOT NULL,
    fecha_inicio timestamp with time zone NOT NULL,
    fecha_fin timestamp with time zone
);


ALTER TABLE public.cita_trabajadores OWNER TO postgres;

--
-- Name: citas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.citas (
    id_cita uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    id_mascota uuid NOT NULL,
    id_servicio uuid NOT NULL,
    fecha_cita date NOT NULL,
    estado_empleado text DEFAULT 'pendiente'::text NOT NULL,
    estado_cliente text DEFAULT 'pendiente'::text NOT NULL,
    estado_global text DEFAULT 'pendiente'::text NOT NULL,
    motivo_cancelacion text,
    cancelado_por uuid,
    terminado_por_empleado uuid,
    conforme_por_cliente uuid,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_ultima_actualizacion timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.citas OWNER TO postgres;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id_cliente uuid DEFAULT gen_random_uuid() NOT NULL,
    id_usuario uuid NOT NULL,
    telefono text,
    direccion text,
    ci text,
    canal_notificacion text,
    horarios_preferidos text
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: detalle_pedido_clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_pedido_clientes (
    id_detalle uuid DEFAULT gen_random_uuid() NOT NULL,
    id_pedido uuid NOT NULL,
    id_producto uuid NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    precio_unitario numeric(10,2) NOT NULL
);


ALTER TABLE public.detalle_pedido_clientes OWNER TO postgres;

--
-- Name: ficha_grooming_checklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ficha_grooming_checklist (
    id_ficha_item uuid DEFAULT gen_random_uuid() NOT NULL,
    id_ficha uuid NOT NULL,
    id_item uuid NOT NULL,
    realizado boolean DEFAULT false NOT NULL,
    observacion text
);


ALTER TABLE public.ficha_grooming_checklist OWNER TO postgres;

--
-- Name: fichas_grooming; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fichas_grooming (
    id_ficha uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cita uuid NOT NULL,
    estado_ingreso text,
    observaciones text,
    tamano_mascota text,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_cierre timestamp with time zone,
    temperatura numeric(5,2),
    notas_internas text,
    consumido_inventario boolean DEFAULT false NOT NULL
);


ALTER TABLE public.fichas_grooming OWNER TO postgres;

--
-- Name: fichas_grooming_insumos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fichas_grooming_insumos (
    id_ficha_insumo uuid DEFAULT gen_random_uuid() NOT NULL,
    id_ficha uuid NOT NULL,
    id_producto uuid NOT NULL,
    unidades_usadas numeric(10,2) NOT NULL
);


ALTER TABLE public.fichas_grooming_insumos OWNER TO postgres;

--
-- Name: fotos_grooming; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fotos_grooming (
    id_foto uuid DEFAULT gen_random_uuid() NOT NULL,
    id_ficha uuid NOT NULL,
    tipo text NOT NULL,
    url_foto text NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fotos_grooming OWNER TO postgres;

--
-- Name: mascota_vacunas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mascota_vacunas (
    id_mascota_vacuna uuid DEFAULT gen_random_uuid() NOT NULL,
    id_mascota uuid NOT NULL,
    id_vacuna uuid NOT NULL,
    fecha_aplicacion date NOT NULL,
    fecha_proxima date,
    observaciones text
);


ALTER TABLE public.mascota_vacunas OWNER TO postgres;

--
-- Name: mascotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mascotas (
    id_mascota uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    nombre text NOT NULL,
    raza text,
    fecha_nacimiento date,
    tamano text,
    peso_kg numeric(5,2),
    foto_url text,
    notas text,
    alergias text,
    restricciones text,
    temperamento text
);


ALTER TABLE public.mascotas OWNER TO postgres;

--
-- Name: opiniones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opiniones (
    id_opinion uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cita uuid NOT NULL,
    id_cliente uuid NOT NULL,
    calificacion smallint NOT NULL,
    comentario text,
    fecha_opinion timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opiniones OWNER TO postgres;

--
-- Name: pagos_empleados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagos_empleados (
    id_pago uuid DEFAULT gen_random_uuid() NOT NULL,
    id_trabajador uuid NOT NULL,
    monto numeric(14,2) NOT NULL,
    fecha_pago timestamp with time zone,
    periodo_desde date NOT NULL,
    periodo_hasta date NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    descripcion text
);


ALTER TABLE public.pagos_empleados OWNER TO postgres;

--
-- Name: pedidos_clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pedidos_clientes (
    id_pedido uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid,
    fecha_pedido timestamp with time zone DEFAULT now() NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL
);


ALTER TABLE public.pedidos_clientes OWNER TO postgres;

--
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id_producto uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    categoria text NOT NULL,
    precio numeric(10,2) NOT NULL,
    stock_unidades numeric(10,2) DEFAULT 0 NOT NULL,
    estado text DEFAULT 'disponible'::text NOT NULL,
    unidad_presentacion text,
    sku text,
    stock_minimo numeric(10,2) DEFAULT 0 NOT NULL,
    imagen_url text
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id_rol uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: servicio_checklist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicio_checklist_items (
    id_servicio_checklist uuid DEFAULT gen_random_uuid() NOT NULL,
    id_servicio uuid NOT NULL,
    id_item uuid NOT NULL
);


ALTER TABLE public.servicio_checklist_items OWNER TO postgres;

--
-- Name: servicios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicios (
    id_servicio uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    duracion_estimada_min integer NOT NULL,
    precio numeric(10,2) NOT NULL,
    unidades_base_insumo numeric(10,2) DEFAULT 1.0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    permite_doble_booking boolean DEFAULT false NOT NULL,
    requiere_bloqueo_consecutivo boolean DEFAULT false NOT NULL,
    factor_tamano_raza jsonb
);


ALTER TABLE public.servicios OWNER TO postgres;

--
-- Name: trabajadores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trabajadores (
    id_trabajador uuid DEFAULT gen_random_uuid() NOT NULL,
    id_usuario uuid NOT NULL,
    sueldo_mensual numeric(10,2) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    especialidad text,
    capacidad_simultanea integer,
    turno text,
    telefono text
);


ALTER TABLE public.trabajadores OWNER TO postgres;

--
-- Name: transacciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transacciones (
    id_transaccion uuid DEFAULT gen_random_uuid() NOT NULL,
    id_caja uuid NOT NULL,
    tipo text NOT NULL,
    monto numeric(14,2) NOT NULL,
    descripcion text,
    fecha_solicitud timestamp with time zone DEFAULT now() NOT NULL,
    fecha_aprobacion_admin timestamp with time zone,
    fecha_aprobacion_jefe timestamp with time zone,
    estado_admin text DEFAULT 'pendiente'::text NOT NULL,
    estado_jefe text DEFAULT 'pendiente'::text NOT NULL,
    estado_global text DEFAULT 'pendiente'::text NOT NULL,
    id_usuario_solicita uuid NOT NULL,
    id_usuario_admin uuid,
    id_usuario_jefe uuid,
    id_referencia uuid
);


ALTER TABLE public.transacciones OWNER TO postgres;

--
-- Name: user_activation_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activation_tokens (
    id_token uuid DEFAULT gen_random_uuid() NOT NULL,
    id_usuario uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_activation_tokens OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usuario uuid DEFAULT gen_random_uuid() NOT NULL,
    id_rol uuid NOT NULL,
    nombre text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    estado text DEFAULT 'activo'::text NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret text,
    ultimo_acceso timestamp with time zone,
    ip_ultimo_acceso text,
    user_agent text,
    debe_cambiar_password boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    lock_until timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usuarios_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'activo'::text, 'inactivo'::text, 'bloqueado'::text])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: vacunas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vacunas (
    id_vacuna uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text
);


ALTER TABLE public.vacunas OWNER TO postgres;

--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id_log, id_usuario, accion, detalle, ip_address, user_agent, fecha) FROM stdin;
e4946baf-fe8d-44f7-93e6-cb1dea45c426	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-07 00:10:12.053458-04
628909fd-57b5-46b6-b9b6-353c22dde0ae	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: mario10@empleado.com (rol=trabajador) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-07 00:29:47.834851-04
df87ff8d-a5af-473d-97f3-5794a12e02dc	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: pep10@empleado.com (rol=trabajador) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-07 00:32:24.681448-04
22fb3279-a653-46c0-9e21-9a1cfe2afd43	630c7840-4f89-4594-940d-71a01641f2d7	registro_cliente	Cliente registrado con email juan10@cliente.com	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-07 00:35:03.106859-04
436c1fb2-87de-4dfc-8447-d056e0660527	630c7840-4f89-4594-940d-71a01641f2d7	cambio_password	Contraseña actualizada correctamente	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-07 00:35:45.627701-04
571f15af-c62f-4797-8036-51ce9de35676	fccb7d56-7f64-4091-80a8-f5aefdf27281	registro_cliente	Cliente registrado con email sara10@cliente.com	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-07 01:18:27.390658-04
8c1663e9-fe76-4e58-8c16-f7588a699067	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:02:01.077131-04
8580e85d-7626-4274-ad00-df4eb5407581	a20a7bcf-94ac-4258-8433-a7224d519ba4	login	Login exitoso (rol=trabajador)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:35:23.578827-04
77fbb6fe-6dd0-41b9-9306-265820ef79f3	a20a7bcf-94ac-4258-8433-a7224d519ba4	cambio_password	Cambio de contraseña inicial: cuenta activada	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:35:46.792999-04
6781bca4-e375-4384-afa2-8cb23c2bae03	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:39:25.48337-04
c3d09f7f-3d53-4060-be86-526461b8387b	a766670e-bf00-439f-a11d-4356abf872e7	cambio_estado_usuario	Estado del usuario a20a7bcf-94ac-4258-8433-a7224d519ba4 cambiado a 'inactivo' por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:43:48.119088-04
2c824e05-d03b-4447-bf07-8a954becd23e	a766670e-bf00-439f-a11d-4356abf872e7	actualizar_empleado	Empleado 6a1d43c8-fc95-40c2-8cfa-c790cf20be2a actualizado por admin@petspa.test. Cambios: {"activo":false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:43:54.149003-04
7bdbdca8-2f3c-4593-822a-56608c85a151	a766670e-bf00-439f-a11d-4356abf872e7	actualizar_empleado	Empleado 6a1d43c8-fc95-40c2-8cfa-c790cf20be2a actualizado por admin@petspa.test. Cambios: {"activo":true}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:44:35.480983-04
9e0b06be-a314-442e-9782-a5af00d544c5	a766670e-bf00-439f-a11d-4356abf872e7	cambio_estado_usuario	Estado del usuario a20a7bcf-94ac-4258-8433-a7224d519ba4 cambiado a 'activo' por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:44:38.702569-04
46f0483f-7d97-4e0b-aaae-0ec012a815fb	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: recepcion1@petspa.test (rol=recepcion, estado=inactivo, debe_cambiar_password=TRUE) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:47:04.106599-04
aa0e98f2-2f10-4a62-82d2-3729728df958	66572212-2a85-462d-b620-c32df52175a2	login_fallido	Cuenta inactiva	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:48:19.356526-04
ad40bb36-b4bc-4fea-8931-278fd080194e	66572212-2a85-462d-b620-c32df52175a2	login_fallido	Cuenta inactiva	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:48:30.663449-04
d878c27b-6acd-4908-b0e6-0bcc6f54d83f	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:48:49.643023-04
3a1cbe39-080f-438c-a385-7df8c9363703	66572212-2a85-462d-b620-c32df52175a2	login_fallido	Cuenta inactiva	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:49:47.729937-04
240d184d-5461-45a5-b669-57064ff20fa3	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:53:18.848068-04
67918cbb-9fc0-413d-b615-12a45d8df522	a766670e-bf00-439f-a11d-4356abf872e7	cambio_estado_usuario	Estado del usuario 66572212-2a85-462d-b620-c32df52175a2 cambiado a 'activo' por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:53:25.105061-04
a1c4b1f4-5e7e-4bad-b038-495c0460ddb5	66572212-2a85-462d-b620-c32df52175a2	login	Login exitoso (rol=recepcion)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:53:44.924129-04
79551d8d-e8ca-430d-8f45-131a32dfbbdd	66572212-2a85-462d-b620-c32df52175a2	cambio_password	Cambio de contraseña inicial: cuenta activada	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:54:34.54321-04
5a93cb57-770a-424e-9bb2-8be917b15efd	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:55:13.090731-04
47cc82e7-5ade-4a5b-9466-6559efc112f0	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: groomer1@petspa.test (rol=groomer, estado=inactivo, debe_cambiar_password=TRUE) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:55:56.722756-04
c67f1a9d-740f-4f5e-a706-a4eeb30d35e8	a766670e-bf00-439f-a11d-4356abf872e7	cambio_estado_usuario	Estado del usuario 43366bb9-bed2-4fc9-b929-bb171ac5b059 cambiado a 'activo' por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 20:56:06.703184-04
f5735c32-b3e2-4641-bed2-b2265fcf57d4	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: g10admin@admin.com (rol=admin, estado=inactivo, debe_cambiar_password=TRUE) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:00:40.655012-04
7cffad4f-5806-4bdb-aeaf-da1573f34274	a766670e-bf00-439f-a11d-4356abf872e7	cambio_estado_usuario	Estado del usuario 4a576cd7-4620-4925-aa27-48d3324c8e12 cambiado a 'activo' por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:00:52.913159-04
fabdc3c9-899f-47e3-8e1b-db9324dcc131	4a576cd7-4620-4925-aa27-48d3324c8e12	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:01:16.543056-04
b0073359-94fe-4846-b538-0faa7a2b7cd9	4a576cd7-4620-4925-aa27-48d3324c8e12	cambio_password	Cambio de contraseña inicial: cuenta activada	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:01:57.067921-04
b4625570-0e9e-42a3-bda0-ca41555f0890	4a576cd7-4620-4925-aa27-48d3324c8e12	actualizar_empleado	Empleado 887ac8de-ae1b-452f-afdf-828c6002e315 actualizado por g10admin@admin.com. Cambios: {"activo":false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:02:09.884218-04
29afda71-9c1c-47ec-a9c7-7584f7156def	4a576cd7-4620-4925-aa27-48d3324c8e12	actualizar_empleado	Empleado 887ac8de-ae1b-452f-afdf-828c6002e315 actualizado por g10admin@admin.com. Cambios: {"activo":true}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:02:10.569446-04
dacc89bf-150c-4100-ab58-5db068405320	4a576cd7-4620-4925-aa27-48d3324c8e12	actualizar_empleado	Empleado fdfcf44c-68bd-49bf-9768-3d5cbc85c1af actualizado por g10admin@admin.com. Cambios: {"activo":false}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:06:29.49157-04
152f6696-3230-4e0c-b164-4b5751a53454	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:09:40.430341-04
9c80f838-19ef-4c15-8045-2f0d4dffd5ba	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_enable_fallido	Código TOTP inválido al intentar habilitar 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:14:19.693488-04
3577c9a2-1c88-4201-b120-20bb9dff2ebc	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 1	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:14:48.518962-04
160870ad-1d32-4805-aff9-a696cf5880ee	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 2	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:14:58.295673-04
d145f217-b6ce-443f-a68d-4b4f4a0cc169	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 3	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:15:20.356983-04
a8cc5194-ea54-4b24-b9c8-0ef808e5bb71	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 4	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:15:37.680318-04
efa0a41c-a0b9-445c-9cf8-26dab41383da	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 5	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:15:41.400411-04
05d5a824-81c4-404b-84ba-5e0da8ecabab	4a576cd7-4620-4925-aa27-48d3324c8e12	cuenta_bloqueada	Bloqueo automático por 5 intentos fallidos hasta Fri May 08 2026 21:30:41 GMT-0400 (hora de Bolivia)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:15:41.427365-04
643f0ad0-77b0-4244-921e-6fdf0be2a037	4a576cd7-4620-4925-aa27-48d3324c8e12	login_bloqueado	Intento de login con cuenta bloqueada hasta Fri May 08 2026 21:30:41 GMT-0400 (hora de Bolivia)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:21:15.883867-04
6937010e-4cbd-4f6f-9ef3-c0101b33d2a3	4a576cd7-4620-4925-aa27-48d3324c8e12	login_bloqueado	Intento de login con cuenta bloqueada hasta Fri May 08 2026 21:30:41 GMT-0400 (hora de Bolivia)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:22:19.112951-04
9ad8c16e-6282-4e23-bc00-ee1aa2ec4499	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 1	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:23:14.127909-04
3be6090c-c7a2-4c62-89c0-7f064cab77ac	4a576cd7-4620-4925-aa27-48d3324c8e12	login_fallido	Contraseña incorrecta. Intentos: 2	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:23:44.568526-04
cd93dd7b-2e9b-4f35-9c2b-1013eca6d0dc	4a576cd7-4620-4925-aa27-48d3324c8e12	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:24:09.799903-04
6f4b0bb9-39a7-4825-b4b2-5db3c237b035	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:24:13.211258-04
be793efe-e7a2-4c4f-aadd-89cbb59adace	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_habilitado	2FA habilitado correctamente	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:28:30.229568-04
ceba94b4-33b4-46e8-a76e-abbb6aa7fa43	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:29:01.004948-04
5775bcf5-aded-4b03-befb-cd60bb04623e	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_habilitado	2FA habilitado correctamente	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:29:56.969087-04
dc528422-4f33-4abf-9c1d-6d1b49e5dea9	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:48:17.743023-04
4141f456-e5bc-4eab-a76f-f17c39e6091f	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_habilitado	2FA habilitado correctamente	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:49:00.908251-04
0c7771c2-7321-4a27-84bd-40a6b44e2c86	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:49:11.753996-04
a36c65ce-f98f-46ac-a8a0-2b3f2aca4d01	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_enable_fallido	Código TOTP inválido al intentar habilitar 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:49:19.632204-04
ca49ae02-1334-4ce7-be13-39eba1512d6a	4a576cd7-4620-4925-aa27-48d3324c8e12	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:49:34.761372-04
e9bdbfc3-332a-456f-8e66-09886d9e0bcd	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:52:44.832563-04
22974432-d27c-479c-8c2b-158b338a24e4	4a576cd7-4620-4925-aa27-48d3324c8e12	2fa_habilitado	2FA habilitado correctamente	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:53:04.204248-04
a1c1f29e-3d3f-46eb-998f-e0a9d291736f	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:54:09.595335-04
d0336347-cc2c-4af2-8ef6-85311eb44a5b	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:54:23.708793-04
59f2acad-e6ab-4555-a0f6-bd1984f32613	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:54:54.00641-04
0cf134a3-6981-4073-a0b8-6b05f1ee50db	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 21:55:01.349477-04
ec43707e-e02c-4c0b-80bd-09af9a4a3357	4a576cd7-4620-4925-aa27-48d3324c8e12	crear_empleado	Empleado creado: trabajadorgroomer@gmail.com (rol=groomer, estado=activo, debe_cambiar_password=TRUE) por g10admin@admin.com	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:40:38.335128-04
46c4a8b0-70f0-48a0-9f83-d094a44baeb7	914d75bb-85e0-430a-a528-d44486685778	login	Login exitoso (rol=groomer)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:41:51.502647-04
6b124c3e-d30b-4470-ac7b-52a30fd5641e	914d75bb-85e0-430a-a528-d44486685778	cambio_password	Cambio de contraseña inicial: cuenta activada	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:42:24.710221-04
013969e3-3ba9-4704-a3c7-57055c9ba185	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:42:49.013312-04
c71001e4-ecd8-4986-bef5-adafa27852f7	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:42:57.18149-04
a1a3c132-0513-456f-b6df-aa00c6417a20	9503797d-fb43-477f-bef9-d9269c290317	registro_cliente	Cliente registrado con email jperez@cliente.com (estado=pendiente, token enviado)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:45:20.607924-04
2a41112c-7050-4fbd-b1ea-864e3932742f	9503797d-fb43-477f-bef9-d9269c290317	activacion_cuenta	Cuenta activada vía token	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:45:43.52758-04
35d65d28-05fc-41cf-8d0c-9cda8a1e0ce0	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:46:20.918822-04
f16dd330-9581-40b5-8720-91455f8b4629	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:46:27.163036-04
ef67df92-b734-4d63-bac6-080e1cebcd03	aa1a55f9-6af0-4481-9b77-2aa8cd309e80	registro_cliente	Cliente registrado con email marioperez@cliente.com (estado=pendiente, token enviado)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:49:22.929529-04
3e8f5a2d-211c-4053-88fb-2550d8e8554b	aa1a55f9-6af0-4481-9b77-2aa8cd309e80	activacion_cuenta	Cuenta activada vía token	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:49:58.222791-04
9d36e901-b8f9-4fe9-8eda-2d5882bb1a4d	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:50:39.835305-04
4cd7fdf9-6661-44af-9f11-01dfa8ef4d49	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: empleado123@gmail.com (rol=groomer, estado=activo, debe_cambiar_password=TRUE) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:52:40.973847-04
d45365a3-af29-4669-b790-ee5c14522c42	a201fb07-02ca-4b40-ae80-6ca21ce5a907	login	Login exitoso (rol=groomer)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:54:01.656623-04
5301b650-b4a5-4679-9513-b7221760c9a2	a201fb07-02ca-4b40-ae80-6ca21ce5a907	cambio_password	Cambio de contraseña inicial: cuenta activada	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:54:47.451827-04
90bd411d-bafd-4f55-8530-cda1b8a0b2a3	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:56:31.759912-04
7d86a3d8-2ffe-4e6e-8a15-f9dcb5ef7a24	4a576cd7-4620-4925-aa27-48d3324c8e12	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:56:38.78384-04
f20ef302-20ee-47f1-940f-4e1f1af276bd	a766670e-bf00-439f-a11d-4356abf872e7	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:57:03.654831-04
ad937058-456c-45d7-9d78-5c0d4fd1c8ca	a766670e-bf00-439f-a11d-4356abf872e7	2fa_setup	Generado nuevo secret TOTP (pendiente de habilitar)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:57:12.125518-04
ecf56a66-934d-4abe-b6bf-f4db54421d05	a766670e-bf00-439f-a11d-4356abf872e7	2fa_habilitado	2FA habilitado correctamente	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:57:34.121747-04
4dba4884-2d83-4a67-8dc1-f3180bb5ccd6	a766670e-bf00-439f-a11d-4356abf872e7	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:58:30.862089-04
6dd5632d-3be1-4ede-b191-dcd2d7f93802	a766670e-bf00-439f-a11d-4356abf872e7	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:58:38.574232-04
9a454b87-aab7-46c1-84aa-21e8946ab69f	a766670e-bf00-439f-a11d-4356abf872e7	cambio_estado_usuario	Estado del usuario a201fb07-02ca-4b40-ae80-6ca21ce5a907 cambiado a 'inactivo' por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:59:40.718075-04
fbdb6ba2-b956-497c-9476-7bea0841da22	a201fb07-02ca-4b40-ae80-6ca21ce5a907	login_fallido	Cuenta inactiva	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 22:59:57.984981-04
50a592df-6d98-4703-952f-9b22109a5817	a766670e-bf00-439f-a11d-4356abf872e7	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 23:00:22.859058-04
fbf0bfd4-610a-4c16-9cee-8bb9816506a0	a766670e-bf00-439f-a11d-4356abf872e7	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-08 23:00:33.202312-04
d2da7d58-1940-4ed0-aa55-dbd5ce347c7b	a766670e-bf00-439f-a11d-4356abf872e7	login_2fa_pendiente	2FA requerido para completar el login	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-14 11:28:17.257998-04
26817fa5-20b5-4505-992c-f672e73f8399	a766670e-bf00-439f-a11d-4356abf872e7	login_2fa_ok	Login completado con 2FA	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-14 11:28:33.605591-04
1eabdf69-a9d7-4814-a258-26ca15e3c7f3	a766670e-bf00-439f-a11d-4356abf872e7	crear_empleado	Empleado creado: adminprueba@petspa.com (rol=admin, estado=activo, debe_cambiar_password=TRUE) por admin@petspa.test	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-14 11:31:17.828018-04
6a48c8bb-6463-4919-bbb6-aaa0f7fc593b	99c2c44b-8543-4e3d-ad5c-46b4395e0044	login	Login exitoso (rol=admin)	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-14 11:31:42.390797-04
7420db92-57c4-4565-a903-874ccf96e791	99c2c44b-8543-4e3d-ad5c-46b4395e0044	cambio_password	Cambio de contraseña inicial: cuenta activada	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-14 11:32:08.410454-04
\.


--
-- Data for Name: bloqueos_agenda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bloqueos_agenda (id_bloqueo, fecha, motivo, tipo, id_trabajador) FROM stdin;
\.


--
-- Data for Name: cajas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cajas (id_caja, nombre, descripcion, estado, saldo_actual) FROM stdin;
\.


--
-- Data for Name: checklist_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checklist_items (id_item, nombre, descripcion) FROM stdin;
\.


--
-- Data for Name: cita_movimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cita_movimientos (id_movimiento, id_cita, tipo_movimiento, fecha_anterior, fecha_nueva, id_usuario_origen, descripcion, fecha_registro) FROM stdin;
\.


--
-- Data for Name: cita_trabajadores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cita_trabajadores (id_cita_trabajador, id_cita, id_trabajador, fecha_inicio, fecha_fin) FROM stdin;
\.


--
-- Data for Name: citas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.citas (id_cita, id_cliente, id_mascota, id_servicio, fecha_cita, estado_empleado, estado_cliente, estado_global, motivo_cancelacion, cancelado_por, terminado_por_empleado, conforme_por_cliente, fecha_creacion, fecha_ultima_actualizacion) FROM stdin;
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id_cliente, id_usuario, telefono, direccion, ci, canal_notificacion, horarios_preferidos) FROM stdin;
eb0d4cf3-799b-4cef-902e-19b654f25b9f	ea847127-93e0-4f92-933e-1c9490469dca	700-00000	Dirección por defecto	\N	\N	\N
bfa7dded-28b2-4892-a5dd-e113ec1aab69	630c7840-4f89-4594-940d-71a01641f2d7	77788822	calle 1 zona 2	12345678	\N	\N
be81e941-5820-48c4-bd20-dbfa6cec20d8	fccb7d56-7f64-4091-80a8-f5aefdf27281	78787878	calle 2 av 3	12312345	\N	\N
74469512-774d-49a5-8d07-dd119a3e889d	9503797d-fb43-477f-bef9-d9269c290317	12345678	calle 1 avenida 2	11111111	\N	\N
9aa65845-f315-430c-8e6e-d75bdf5f01df	aa1a55f9-6af0-4481-9b77-2aa8cd309e80	12345678	calle 2 avenida 3	11111111	\N	\N
\.


--
-- Data for Name: detalle_pedido_clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_pedido_clientes (id_detalle, id_pedido, id_producto, cantidad, precio_unitario) FROM stdin;
3ae57188-ad94-4ccb-b4a7-2ff9267b0594	133f2dac-51ae-4f55-974b-0c2a12933492	924ee8ae-dbda-497a-939b-dc3c338b221d	2.00	40.00
b9bd3bb4-d916-4367-a73e-f8f17eda974d	133f2dac-51ae-4f55-974b-0c2a12933492	f7452995-2591-4475-8188-39128a5f7e02	1.00	25.00
\.


--
-- Data for Name: ficha_grooming_checklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ficha_grooming_checklist (id_ficha_item, id_ficha, id_item, realizado, observacion) FROM stdin;
\.


--
-- Data for Name: fichas_grooming; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fichas_grooming (id_ficha, id_cita, estado_ingreso, observaciones, tamano_mascota, fecha_creacion, fecha_cierre, temperatura, notas_internas, consumido_inventario) FROM stdin;
\.


--
-- Data for Name: fichas_grooming_insumos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fichas_grooming_insumos (id_ficha_insumo, id_ficha, id_producto, unidades_usadas) FROM stdin;
\.


--
-- Data for Name: fotos_grooming; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fotos_grooming (id_foto, id_ficha, tipo, url_foto, fecha_registro) FROM stdin;
\.


--
-- Data for Name: mascota_vacunas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mascota_vacunas (id_mascota_vacuna, id_mascota, id_vacuna, fecha_aplicacion, fecha_proxima, observaciones) FROM stdin;
\.


--
-- Data for Name: mascotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mascotas (id_mascota, id_cliente, nombre, raza, fecha_nacimiento, tamano, peso_kg, foto_url, notas, alergias, restricciones, temperamento) FROM stdin;
\.


--
-- Data for Name: opiniones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opiniones (id_opinion, id_cita, id_cliente, calificacion, comentario, fecha_opinion) FROM stdin;
\.


--
-- Data for Name: pagos_empleados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos_empleados (id_pago, id_trabajador, monto, fecha_pago, periodo_desde, periodo_hasta, estado, descripcion) FROM stdin;
\.


--
-- Data for Name: pedidos_clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pedidos_clientes (id_pedido, id_cliente, fecha_pedido, total, estado) FROM stdin;
10f3a37d-d7e0-4613-8922-5f43ada804f5	\N	2026-04-29 20:50:36.744007-04	80.00	pendiente
3cbc868a-9f8c-44e8-8f16-8d1e84cb1581	\N	2026-04-29 20:50:36.744007-04	40.00	pagado
1ff212f6-63b8-44eb-a37a-07f6759437cf	\N	2026-04-29 21:00:02.658632-04	80.00	pendiente
6d4a6f56-6868-4aaa-b633-91d778153ebc	\N	2026-04-29 21:00:02.658632-04	40.00	pagado
133f2dac-51ae-4f55-974b-0c2a12933492	eb0d4cf3-799b-4cef-902e-19b654f25b9f	2026-04-29 21:03:53.658768-04	80.00	pendiente
5865a718-a4b4-4b10-9440-95fd92358923	eb0d4cf3-799b-4cef-902e-19b654f25b9f	2026-04-29 21:03:53.658768-04	40.00	pagado
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id_producto, nombre, descripcion, categoria, precio, stock_unidades, estado, unidad_presentacion, sku, stock_minimo, imagen_url) FROM stdin;
f7452995-2591-4475-8188-39128a5f7e02	Shampoo Spa Basic	Shampoo estándar para baño rápido	insumo_grooming	25.00	50.00	disponible	frasco 250ml	\N	0.00	\N
61156902-b1b6-4339-a61a-8248f90d4475	Talco Spa Fresh	Talco perfumado para mascotas	insumo_grooming	15.00	30.00	disponible	sachet	\N	0.00	\N
924ee8ae-dbda-497a-939b-dc3c338b221d	Collar Rojo Talla M	Collar para mascotas talla mediana	accesorio_venta	40.00	20.00	disponible	unidad	\N	0.00	\N
c38f7159-71b5-460f-afa0-30f04ae14c10	Shampoo Spa Basic	Shampoo estándar para baño rápido	insumo_grooming	25.00	50.00	disponible	frasco 250ml	\N	0.00	\N
222c5fc5-ed48-4979-8502-cc291aecf8d8	Collar Rojo Talla M	Collar para mascotas talla mediana	accesorio_venta	40.00	20.00	disponible	unidad	\N	0.00	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id_rol, name, description) FROM stdin;
77ed81e1-f80a-4c8c-9a18-84b08e64c56d	cliente	Cliente del SPA
d6b9f5ed-bca4-4df1-a08f-37f9f10ebc49	trabajador	Empleado del SPA
d54eeb02-cb20-4c45-89b1-5a28b5c780de	admin	Administrador del sistema: configura servicios, productos, inventario y reportes.
df8b4e9c-72e8-4e27-aba4-3d66074dfbf5	jefe	Jefe del SPA: aprueba transacciones, supervisa caja y pagos a empleados.
55d83f35-2b91-4cec-869d-90a437391f12	recepcion	Personal de recepción: agenda citas, atiende clientes y gestiona pagos básicos
f009700d-6ded-497d-b167-e1fbfc1d0412	groomer	Groomer o estilista canino: realiza servicios de grooming y actualiza fichas de mascotas
\.


--
-- Data for Name: servicio_checklist_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servicio_checklist_items (id_servicio_checklist, id_servicio, id_item) FROM stdin;
\.


--
-- Data for Name: servicios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servicios (id_servicio, nombre, descripcion, duracion_estimada_min, precio, unidades_base_insumo, activo, permite_doble_booking, requiere_bloqueo_consecutivo, factor_tamano_raza) FROM stdin;
\.


--
-- Data for Name: trabajadores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trabajadores (id_trabajador, id_usuario, sueldo_mensual, activo, especialidad, capacidad_simultanea, turno, telefono) FROM stdin;
0678d9f0-b3e8-4e3b-a7c7-8957114013bf	4a45b2e2-a474-4154-b2ef-5c4c2a0c8c60	3000.00	t	fino	3	mañana	77711888
6a1d43c8-fc95-40c2-8cfa-c790cf20be2a	a20a7bcf-94ac-4258-8433-a7224d519ba4	2000.00	t	Corte	1	mañana	77711888
db702cb5-a8e9-4f85-98f3-82b8b46ae389	66572212-2a85-462d-b620-c32df52175a2	2500.00	t	corte fino	2	mañana	12345678
fdfcf44c-68bd-49bf-9768-3d5cbc85c1af	43366bb9-bed2-4fc9-b929-bb171ac5b059	3500.00	f	baño	3	tarde	12345678
b68a03b8-75ce-4a6d-8c14-16fc04596a87	914d75bb-85e0-430a-a528-d44486685778	1500.00	t	masaje	5	mañana	98765432
1cf5ad58-3018-4a39-bc55-d11331be65ba	a201fb07-02ca-4b40-ae80-6ca21ce5a907	1500.00	t	corte	5	tarde	12345678
\.


--
-- Data for Name: transacciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transacciones (id_transaccion, id_caja, tipo, monto, descripcion, fecha_solicitud, fecha_aprobacion_admin, fecha_aprobacion_jefe, estado_admin, estado_jefe, estado_global, id_usuario_solicita, id_usuario_admin, id_usuario_jefe, id_referencia) FROM stdin;
\.


--
-- Data for Name: user_activation_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_activation_tokens (id_token, id_usuario, token, expires_at, used, created_at) FROM stdin;
beb41e46-37ac-49f7-adbd-3c1e887e2fef	9503797d-fb43-477f-bef9-d9269c290317	7c1f1d5cddbec3e104b96742b7c37d2d3a9811862af7c08159cea0bb9b26197f	2026-05-08 23:00:20.607924-04	t	2026-05-08 22:45:20.607924-04
3d8ad564-ba81-4122-9fac-abe731315dd6	aa1a55f9-6af0-4481-9b77-2aa8cd309e80	1025dd2ddf26c825edb5cea769c0e654bfd72a96e25a31a321494386920904d6	2026-05-08 23:04:22.929529-04	t	2026-05-08 22:49:22.929529-04
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id_usuario, id_rol, nombre, email, password_hash, estado, two_factor_enabled, two_factor_secret, ultimo_acceso, ip_ultimo_acceso, user_agent, debe_cambiar_password, failed_login_attempts, lock_until, fecha_creacion) FROM stdin;
ea847127-93e0-4f92-933e-1c9490469dca	77ed81e1-f80a-4c8c-9a18-84b08e64c56d	Usuario Demo	demo@example.com	$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHijklmno	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
1d6b88f7-7b8c-4401-8712-1a30ebe258e4	77ed81e1-f80a-4c8c-9a18-84b08e64c56d	Cliente Demo	cliente.demo@example.com	$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHijklmno	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
524ff7f3-f028-4fb5-a19b-8830dc6a9074	d6b9f5ed-bca4-4df1-a08f-37f9f10ebc49	Groomer Demo	groomer.demo@example.com	$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHijklmno	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
ee2a3003-68bf-4784-b0b8-92eabf618895	d54eeb02-cb20-4c45-89b1-5a28b5c780de	Admin Demo	admin.demo@example.com	$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHijklmno	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
42ba1dca-54d4-4e62-b74f-dd8ddaa2b663	df8b4e9c-72e8-4e27-aba4-3d66074dfbf5	Jefe Demo	jefe.demo@example.com	$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHijklmno	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
4a45b2e2-a474-4154-b2ef-5c4c2a0c8c60	d6b9f5ed-bca4-4df1-a08f-37f9f10ebc49	Pepe Perez	pep10@empleado.com	$2b$12$Fpw5w4AwVDLQCE4CfMuZH.IgLOIxGLWvuUFhqpOKZSAUmX.PkThJW	activo	f	\N	\N	\N	\N	t	0	\N	2026-05-08 00:15:29.93404-04
630c7840-4f89-4594-940d-71a01641f2d7	77ed81e1-f80a-4c8c-9a18-84b08e64c56d	Juan Gomez	juan10@cliente.com	$2b$12$WJ04DbuH5jUHD5uA5644ZO2k3gNcgM/S1Fr9LkpAkIRiERsYKXg5O	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
fccb7d56-7f64-4091-80a8-f5aefdf27281	77ed81e1-f80a-4c8c-9a18-84b08e64c56d	Sara Rojas	sara10@cliente.com	$2b$12$/vEhMxmzdzF4jbHTXOh/gOXvTiysCsmskSOb7n0OADNSIM9VtsK4O	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 00:15:29.93404-04
43366bb9-bed2-4fc9-b929-bb171ac5b059	f009700d-6ded-497d-b167-e1fbfc1d0412	Luis Groomer	groomer1@petspa.test	$2b$12$07zP9ZNsMMYESKg2.E26je6schQXy4Qgk87kq0NJbxAnt/tIEM7ui	activo	f	\N	\N	\N	\N	t	0	\N	2026-05-08 20:55:56.722756-04
aa1a55f9-6af0-4481-9b77-2aa8cd309e80	77ed81e1-f80a-4c8c-9a18-84b08e64c56d	Mario Perez	marioperez@cliente.com	$2b$12$LIlpp7JaBFOATEVKRikblepZJi5ZeplndzKDxw.cfszdjDHbD8h6y	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 22:49:22.929529-04
a201fb07-02ca-4b40-ae80-6ca21ce5a907	f009700d-6ded-497d-b167-e1fbfc1d0412	empleado 1	empleado123@gmail.com	$2b$12$PO8k0xJjdD/xkMLukiyEWesPh.nUPOp7rzDoWBXIWM3vgKBm6fvUa	inactivo	f	\N	2026-05-08 22:54:01.655485-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-08 22:52:40.973847-04
a20a7bcf-94ac-4258-8433-a7224d519ba4	d6b9f5ed-bca4-4df1-a08f-37f9f10ebc49	Mario Bross	mario10@empleado.com	$2b$12$7fkUU6s8RI18SgBY5JMbIOIQrpoZ3H5cfH.naO6msx8UyK8xywiMy	activo	f	\N	2026-05-08 20:35:23.576405-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-08 00:15:29.93404-04
914d75bb-85e0-430a-a528-d44486685778	f009700d-6ded-497d-b167-e1fbfc1d0412	trabajador groomer	trabajadorgroomer@gmail.com	$2b$12$jFuDRFQfYAJxIjcS9XQAZuThH7j6avlVRwa7PLIOJl4N6PdmksXN2	activo	f	\N	2026-05-08 22:41:51.501457-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-08 22:40:38.335128-04
a766670e-bf00-439f-a11d-4356abf872e7	d54eeb02-cb20-4c45-89b1-5a28b5c780de	Admin	admin@petspa.test	$2b$10$CnpEO1MSH4jrmBHGybYBXeK5wd8CzQ7x1xo6TbX8LvP1Zy1zkFHYK	activo	t	NRFVUTDQFERWKJJEJB3CIRCWKJRVK2KE	2026-05-14 11:28:33.602866-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-08 00:15:29.93404-04
4a576cd7-4620-4925-aa27-48d3324c8e12	d54eeb02-cb20-4c45-89b1-5a28b5c780de	Gabriel Admin	g10admin@admin.com	$2b$12$P/RwEA4ItXlCsLmI3L44w.YfRcROAOHO.IOJhNsF65tlCA8RCqI4i	activo	t	H5ISSTZ2HQXHIQ3ZNZPE2SSDNMTES2CV	2026-05-08 22:56:38.782597-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-08 21:00:40.655012-04
66572212-2a85-462d-b620-c32df52175a2	55d83f35-2b91-4cec-869d-90a437391f12	María Recepción	recepcion1@petspa.test	$2b$12$rtL3N39tnU5af9zcGgOTleQk4/IowJLjUUs5VOhOCiujnp0PTFwZK	activo	f	\N	2026-05-08 20:53:44.922722-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-08 20:47:04.106599-04
9503797d-fb43-477f-bef9-d9269c290317	77ed81e1-f80a-4c8c-9a18-84b08e64c56d	juan perez gomez	jperez@cliente.com	$2b$12$rNqSuKJRin9M7xzdXWBzd.RzL5UT8jnzKxfDPV0tMgkCNRkSFxRP6	activo	f	\N	\N	\N	\N	f	0	\N	2026-05-08 22:45:20.607924-04
99c2c44b-8543-4e3d-ad5c-46b4395e0044	d54eeb02-cb20-4c45-89b1-5a28b5c780de	Administrador	adminprueba@petspa.com	$2b$12$YcsxBNUH3I2X/LkL1NOdxO./GHOGJfFOLzEUXgUOT.CaTBay00kou	activo	f	\N	2026-05-14 11:31:42.389571-04	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	f	0	\N	2026-05-14 11:31:17.828018-04
\.


--
-- Data for Name: vacunas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vacunas (id_vacuna, nombre, descripcion) FROM stdin;
\.


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id_log);


--
-- Name: bloqueos_agenda bloqueos_agenda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bloqueos_agenda
    ADD CONSTRAINT bloqueos_agenda_pkey PRIMARY KEY (id_bloqueo);


--
-- Name: cajas cajas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id_caja);


--
-- Name: checklist_items checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_pkey PRIMARY KEY (id_item);


--
-- Name: cita_movimientos cita_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cita_movimientos
    ADD CONSTRAINT cita_movimientos_pkey PRIMARY KEY (id_movimiento);


--
-- Name: cita_trabajadores cita_trabajadores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cita_trabajadores
    ADD CONSTRAINT cita_trabajadores_pkey PRIMARY KEY (id_cita_trabajador);


--
-- Name: citas citas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_pkey PRIMARY KEY (id_cita);


--
-- Name: clientes clientes_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_id_usuario_key UNIQUE (id_usuario);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);


--
-- Name: detalle_pedido_clientes detalle_pedido_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido_clientes
    ADD CONSTRAINT detalle_pedido_clientes_pkey PRIMARY KEY (id_detalle);


--
-- Name: ficha_grooming_checklist ficha_grooming_checklist_id_ficha_id_item_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ficha_grooming_checklist
    ADD CONSTRAINT ficha_grooming_checklist_id_ficha_id_item_key UNIQUE (id_ficha, id_item);


--
-- Name: ficha_grooming_checklist ficha_grooming_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ficha_grooming_checklist
    ADD CONSTRAINT ficha_grooming_checklist_pkey PRIMARY KEY (id_ficha_item);


--
-- Name: fichas_grooming fichas_grooming_id_cita_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_grooming
    ADD CONSTRAINT fichas_grooming_id_cita_key UNIQUE (id_cita);


--
-- Name: fichas_grooming_insumos fichas_grooming_insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_grooming_insumos
    ADD CONSTRAINT fichas_grooming_insumos_pkey PRIMARY KEY (id_ficha_insumo);


--
-- Name: fichas_grooming fichas_grooming_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_grooming
    ADD CONSTRAINT fichas_grooming_pkey PRIMARY KEY (id_ficha);


--
-- Name: fotos_grooming fotos_grooming_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fotos_grooming
    ADD CONSTRAINT fotos_grooming_pkey PRIMARY KEY (id_foto);


--
-- Name: mascota_vacunas mascota_vacunas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mascota_vacunas
    ADD CONSTRAINT mascota_vacunas_pkey PRIMARY KEY (id_mascota_vacuna);


--
-- Name: mascotas mascotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_pkey PRIMARY KEY (id_mascota);


--
-- Name: opiniones opiniones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opiniones
    ADD CONSTRAINT opiniones_pkey PRIMARY KEY (id_opinion);


--
-- Name: pagos_empleados pagos_empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_empleados
    ADD CONSTRAINT pagos_empleados_pkey PRIMARY KEY (id_pago);


--
-- Name: pedidos_clientes pedidos_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedidos_clientes
    ADD CONSTRAINT pedidos_clientes_pkey PRIMARY KEY (id_pedido);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id_producto);


--
-- Name: productos productos_sku_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_sku_unique UNIQUE (sku);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- Name: servicio_checklist_items servicio_checklist_items_id_servicio_id_item_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_checklist_items
    ADD CONSTRAINT servicio_checklist_items_id_servicio_id_item_key UNIQUE (id_servicio, id_item);


--
-- Name: servicio_checklist_items servicio_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_checklist_items
    ADD CONSTRAINT servicio_checklist_items_pkey PRIMARY KEY (id_servicio_checklist);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id_servicio);


--
-- Name: trabajadores trabajadores_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_id_usuario_key UNIQUE (id_usuario);


--
-- Name: trabajadores trabajadores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_pkey PRIMARY KEY (id_trabajador);


--
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id_transaccion);


--
-- Name: user_activation_tokens user_activation_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activation_tokens
    ADD CONSTRAINT user_activation_tokens_pkey PRIMARY KEY (id_token);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: vacunas vacunas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vacunas
    ADD CONSTRAINT vacunas_pkey PRIMARY KEY (id_vacuna);


--
-- Name: idx_activation_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activation_tokens_token ON public.user_activation_tokens USING btree (token);


--
-- Name: idx_activation_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activation_tokens_user ON public.user_activation_tokens USING btree (id_usuario);


--
-- Name: idx_audit_log_accion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_accion ON public.audit_log USING btree (accion);


--
-- Name: idx_audit_log_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_fecha ON public.audit_log USING btree (fecha DESC);


--
-- Name: idx_audit_log_id_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_id_usuario ON public.audit_log USING btree (id_usuario);


--
-- Name: bloqueos_agenda bloqueos_agenda_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bloqueos_agenda
    ADD CONSTRAINT bloqueos_agenda_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.trabajadores(id_trabajador);


--
-- Name: cita_movimientos cita_movimientos_id_cita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cita_movimientos
    ADD CONSTRAINT cita_movimientos_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id_cita);


--
-- Name: cita_movimientos cita_movimientos_id_usuario_origen_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cita_movimientos
    ADD CONSTRAINT cita_movimientos_id_usuario_origen_fkey FOREIGN KEY (id_usuario_origen) REFERENCES public.usuarios(id_usuario);


--
-- Name: cita_trabajadores cita_trabajadores_id_cita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cita_trabajadores
    ADD CONSTRAINT cita_trabajadores_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id_cita);


--
-- Name: cita_trabajadores cita_trabajadores_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cita_trabajadores
    ADD CONSTRAINT cita_trabajadores_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.trabajadores(id_trabajador);


--
-- Name: citas citas_cancelado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_cancelado_por_fkey FOREIGN KEY (cancelado_por) REFERENCES public.usuarios(id_usuario);


--
-- Name: citas citas_conforme_por_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_conforme_por_cliente_fkey FOREIGN KEY (conforme_por_cliente) REFERENCES public.usuarios(id_usuario);


--
-- Name: citas citas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);


--
-- Name: citas citas_id_mascota_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES public.mascotas(id_mascota);


--
-- Name: citas citas_id_servicio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_id_servicio_fkey FOREIGN KEY (id_servicio) REFERENCES public.servicios(id_servicio);


--
-- Name: citas citas_terminado_por_empleado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_terminado_por_empleado_fkey FOREIGN KEY (terminado_por_empleado) REFERENCES public.usuarios(id_usuario);


--
-- Name: clientes clientes_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- Name: detalle_pedido_clientes detalle_pedido_clientes_id_pedido_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido_clientes
    ADD CONSTRAINT detalle_pedido_clientes_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos_clientes(id_pedido);


--
-- Name: detalle_pedido_clientes detalle_pedido_clientes_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_pedido_clientes
    ADD CONSTRAINT detalle_pedido_clientes_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto);


--
-- Name: ficha_grooming_checklist ficha_grooming_checklist_id_ficha_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ficha_grooming_checklist
    ADD CONSTRAINT ficha_grooming_checklist_id_ficha_fkey FOREIGN KEY (id_ficha) REFERENCES public.fichas_grooming(id_ficha);


--
-- Name: ficha_grooming_checklist ficha_grooming_checklist_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ficha_grooming_checklist
    ADD CONSTRAINT ficha_grooming_checklist_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.checklist_items(id_item);


--
-- Name: fichas_grooming fichas_grooming_id_cita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_grooming
    ADD CONSTRAINT fichas_grooming_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id_cita);


--
-- Name: fichas_grooming_insumos fichas_grooming_insumos_id_ficha_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_grooming_insumos
    ADD CONSTRAINT fichas_grooming_insumos_id_ficha_fkey FOREIGN KEY (id_ficha) REFERENCES public.fichas_grooming(id_ficha);


--
-- Name: fichas_grooming_insumos fichas_grooming_insumos_id_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichas_grooming_insumos
    ADD CONSTRAINT fichas_grooming_insumos_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto);


--
-- Name: audit_log fk_audit_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: fotos_grooming fotos_grooming_id_ficha_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fotos_grooming
    ADD CONSTRAINT fotos_grooming_id_ficha_fkey FOREIGN KEY (id_ficha) REFERENCES public.fichas_grooming(id_ficha);


--
-- Name: mascota_vacunas mascota_vacunas_id_mascota_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mascota_vacunas
    ADD CONSTRAINT mascota_vacunas_id_mascota_fkey FOREIGN KEY (id_mascota) REFERENCES public.mascotas(id_mascota);


--
-- Name: mascota_vacunas mascota_vacunas_id_vacuna_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mascota_vacunas
    ADD CONSTRAINT mascota_vacunas_id_vacuna_fkey FOREIGN KEY (id_vacuna) REFERENCES public.vacunas(id_vacuna);


--
-- Name: mascotas mascotas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);


--
-- Name: opiniones opiniones_id_cita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opiniones
    ADD CONSTRAINT opiniones_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id_cita);


--
-- Name: opiniones opiniones_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opiniones
    ADD CONSTRAINT opiniones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);


--
-- Name: pagos_empleados pagos_empleados_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_empleados
    ADD CONSTRAINT pagos_empleados_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.trabajadores(id_trabajador);


--
-- Name: pedidos_clientes pedidos_clientes_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pedidos_clientes
    ADD CONSTRAINT pedidos_clientes_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);


--
-- Name: servicio_checklist_items servicio_checklist_items_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_checklist_items
    ADD CONSTRAINT servicio_checklist_items_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.checklist_items(id_item);


--
-- Name: servicio_checklist_items servicio_checklist_items_id_servicio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicio_checklist_items
    ADD CONSTRAINT servicio_checklist_items_id_servicio_fkey FOREIGN KEY (id_servicio) REFERENCES public.servicios(id_servicio);


--
-- Name: trabajadores trabajadores_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajadores
    ADD CONSTRAINT trabajadores_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- Name: transacciones transacciones_id_caja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES public.cajas(id_caja);


--
-- Name: transacciones transacciones_id_usuario_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_id_usuario_admin_fkey FOREIGN KEY (id_usuario_admin) REFERENCES public.usuarios(id_usuario);


--
-- Name: transacciones transacciones_id_usuario_jefe_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_id_usuario_jefe_fkey FOREIGN KEY (id_usuario_jefe) REFERENCES public.usuarios(id_usuario);


--
-- Name: transacciones transacciones_id_usuario_solicita_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_id_usuario_solicita_fkey FOREIGN KEY (id_usuario_solicita) REFERENCES public.usuarios(id_usuario);


--
-- Name: user_activation_tokens user_activation_tokens_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activation_tokens
    ADD CONSTRAINT user_activation_tokens_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol);


--
-- PostgreSQL database dump complete
--

\unrestrict ABCYeIHM6Vtng1PEgszM67LlGf4ghp8r4gD25uJx06PA9wZOId9qYSNgDbWkeft

