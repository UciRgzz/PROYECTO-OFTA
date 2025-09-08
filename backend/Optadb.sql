--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-09-08 16:06:06

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 228 (class 1259 OID 16592)
-- Name: catalogo_procedimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalogo_procedimientos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    precio numeric(10,2) NOT NULL,
    etiqueta character varying(50)
);


ALTER TABLE public.catalogo_procedimientos OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16591)
-- Name: catalogo_procedimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catalogo_procedimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.catalogo_procedimientos_id_seq OWNER TO postgres;

--
-- TOC entry 5000 (class 0 OID 0)
-- Dependencies: 227
-- Name: catalogo_procedimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.catalogo_procedimientos_id_seq OWNED BY public.catalogo_procedimientos.id;


--
-- TOC entry 224 (class 1259 OID 16451)
-- Name: expedientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expedientes (
    numero_expediente integer NOT NULL,
    nombre_completo text NOT NULL,
    fecha_nacimiento date NOT NULL,
    edad integer NOT NULL,
    padecimientos text,
    colonia text,
    ciudad text,
    telefono1 text,
    telefono2 text,
    departamento character varying(100) NOT NULL,
    CONSTRAINT expedientes_padecimientos_check CHECK ((padecimientos = ANY (ARRAY['DIABETES'::text, 'HIPERTENSO'::text, 'NINGUNO'::text])))
);


ALTER TABLE public.expedientes OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16450)
-- Name: expedientes_numero_expediente_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expedientes_numero_expediente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expedientes_numero_expediente_seq OWNER TO postgres;

--
-- TOC entry 5001 (class 0 OID 0)
-- Dependencies: 223
-- Name: expedientes_numero_expediente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expedientes_numero_expediente_seq OWNED BY public.expedientes.numero_expediente;


--
-- TOC entry 234 (class 1259 OID 16791)
-- Name: insumos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insumos (
    id integer NOT NULL,
    fecha date NOT NULL,
    archivo character varying(255),
    folio character varying(50),
    concepto character varying(255),
    monto numeric(12,2),
    departamento character varying(100)
);


ALTER TABLE public.insumos OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16790)
-- Name: insumos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insumos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insumos_id_seq OWNER TO postgres;

--
-- TOC entry 5002 (class 0 OID 0)
-- Dependencies: 233
-- Name: insumos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insumos_id_seq OWNED BY public.insumos.id;


--
-- TOC entry 232 (class 1259 OID 16770)
-- Name: optometria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.optometria (
    id integer NOT NULL,
    expediente_id integer,
    esfera_od character varying(10),
    cilindro_od character varying(10),
    eje_od character varying(10),
    avcc_od character varying(10),
    adicion_od character varying(10),
    avcc2_od character varying(10),
    esfera_oi character varying(10),
    cilindro_oi character varying(10),
    eje_oi character varying(10),
    avcc_oi character varying(10),
    adicion_oi character varying(10),
    avcc2_oi character varying(10),
    bmp character varying(50),
    bmp_od character varying(50),
    bmp_oi character varying(50),
    fo character varying(50),
    fo_od character varying(50),
    fo_oi character varying(50),
    fecha timestamp without time zone DEFAULT now(),
    departamento character varying(100)
);


ALTER TABLE public.optometria OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16769)
-- Name: optometria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.optometria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.optometria_id_seq OWNER TO postgres;

--
-- TOC entry 5003 (class 0 OID 0)
-- Dependencies: 231
-- Name: optometria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.optometria_id_seq OWNED BY public.optometria.id;


--
-- TOC entry 230 (class 1259 OID 16655)
-- Name: ordenes_medicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ordenes_medicas (
    id integer NOT NULL,
    expediente_id integer,
    folio_recibo integer,
    medico character varying(100) NOT NULL,
    diagnostico text,
    lado character varying(20),
    procedimiento character varying(100),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estatus character varying(20) DEFAULT 'PENDIENTE'::character varying,
    anexos text,
    conjuntiva text,
    cornea text,
    camara_anterior text,
    cristalino text,
    retina text,
    macula text,
    nervio_optico text,
    ciclopejia text,
    hora_tp text,
    problemas text,
    plan text,
    tipo character varying(20) DEFAULT 'Normal'::character varying,
    departamento character varying(100),
    pagado numeric(10,2) DEFAULT 0,
    pendiente numeric(10,2) DEFAULT 0,
    CONSTRAINT ordenes_medicas_lado_check CHECK (((lado)::text = ANY ((ARRAY['OD'::character varying, 'OI'::character varying, 'AMBOS'::character varying, 'NINGUNO'::character varying])::text[])))
);


ALTER TABLE public.ordenes_medicas OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16654)
-- Name: ordenes_medicas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ordenes_medicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordenes_medicas_id_seq OWNER TO postgres;

--
-- TOC entry 5004 (class 0 OID 0)
-- Dependencies: 229
-- Name: ordenes_medicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ordenes_medicas_id_seq OWNED BY public.ordenes_medicas.id;


--
-- TOC entry 218 (class 1259 OID 16388)
-- Name: pacientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pacientes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL
);


ALTER TABLE public.pacientes OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16387)
-- Name: pacientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pacientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pacientes_id_seq OWNER TO postgres;

--
-- TOC entry 5005 (class 0 OID 0)
-- Dependencies: 217
-- Name: pacientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pacientes_id_seq OWNED BY public.pacientes.id;


--
-- TOC entry 220 (class 1259 OID 16407)
-- Name: pagos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagos (
    id integer NOT NULL,
    recibo_id integer,
    monto numeric(10,2),
    fecha date DEFAULT CURRENT_DATE,
    orden_id integer,
    expediente_id integer,
    forma_pago character varying(50),
    departamento character varying(50)
);


ALTER TABLE public.pagos OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16406)
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pagos_id_seq OWNER TO postgres;

--
-- TOC entry 5006 (class 0 OID 0)
-- Dependencies: 219
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- TOC entry 226 (class 1259 OID 16507)
-- Name: recibos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recibos (
    id integer NOT NULL,
    fecha date NOT NULL,
    folio character varying(20) NOT NULL,
    paciente_id integer NOT NULL,
    procedimiento character varying(100) NOT NULL,
    precio numeric(10,2) NOT NULL,
    forma_pago character varying(50) NOT NULL,
    monto_pagado numeric(10,2) NOT NULL,
    pendiente numeric(10,2) GENERATED ALWAYS AS ((precio - monto_pagado)) STORED,
    tipo character varying(20) DEFAULT 'Normal'::character varying,
    departamento character varying(100)
);


ALTER TABLE public.recibos OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16506)
-- Name: recibos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recibos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recibos_id_seq OWNER TO postgres;

--
-- TOC entry 5007 (class 0 OID 0)
-- Dependencies: 225
-- Name: recibos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recibos_id_seq OWNED BY public.recibos.id;


--
-- TOC entry 235 (class 1259 OID 24730)
-- Name: recibos_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.recibos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.recibos_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 16420)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    reset_token text,
    reset_token_expire timestamp without time zone,
    nomina character varying(20),
    rol character varying(20) DEFAULT 'usuario'::character varying,
    departamento character varying(50)
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16419)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5008 (class 0 OID 0)
-- Dependencies: 221
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 4791 (class 2604 OID 16595)
-- Name: catalogo_procedimientos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_procedimientos ALTER COLUMN id SET DEFAULT nextval('public.catalogo_procedimientos_id_seq'::regclass);


--
-- TOC entry 4788 (class 2604 OID 16454)
-- Name: expedientes numero_expediente; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expedientes ALTER COLUMN numero_expediente SET DEFAULT nextval('public.expedientes_numero_expediente_seq'::regclass);


--
-- TOC entry 4800 (class 2604 OID 16794)
-- Name: insumos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos ALTER COLUMN id SET DEFAULT nextval('public.insumos_id_seq'::regclass);


--
-- TOC entry 4798 (class 2604 OID 16773)
-- Name: optometria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optometria ALTER COLUMN id SET DEFAULT nextval('public.optometria_id_seq'::regclass);


--
-- TOC entry 4792 (class 2604 OID 16719)
-- Name: ordenes_medicas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_medicas ALTER COLUMN id SET DEFAULT nextval('public.ordenes_medicas_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 16391)
-- Name: pacientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pacientes ALTER COLUMN id SET DEFAULT nextval('public.pacientes_id_seq'::regclass);


--
-- TOC entry 4784 (class 2604 OID 16410)
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- TOC entry 4786 (class 2604 OID 16423)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 4987 (class 0 OID 16592)
-- Dependencies: 228
-- Data for Name: catalogo_procedimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.catalogo_procedimientos (id, nombre, precio, etiqueta) FROM stdin;
1	Consulta Oftalmológica	500.00	\N
2	Cirugía de Catarata	8000.00	\N
3	Lente Intraocular	2500.00	\N
\.


--
-- TOC entry 4983 (class 0 OID 16451)
-- Dependencies: 224
-- Data for Name: expedientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expedientes (numero_expediente, nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2, departamento) FROM stdin;
1	Mario Gonzales Rosales	1992-02-22	33	NINGUNO	LOS SABINOS	Montemorelos	8261257016	8261297815	Reynosa
2	Dante Juarez Lopez	1998-08-08	27	HIPERTENSO	LOS SABINOS	Montemorelos	8261257016	8261357416	Reynosa
1	Daniel Herrera Rodriguez	2002-02-10	23	NINGUNO	LOS SABINOS	Montemorelos	8261257016	8261751685	Yucatan
\.


--
-- TOC entry 4993 (class 0 OID 16791)
-- Dependencies: 234
-- Data for Name: insumos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insumos (id, fecha, archivo, folio, concepto, monto, departamento) FROM stdin;
2	2025-09-08	\N	1748	insumos cx	2000.00	Reynosa
\.


--
-- TOC entry 4991 (class 0 OID 16770)
-- Dependencies: 232
-- Data for Name: optometria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.optometria (id, expediente_id, esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od, esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi, bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi, fecha, departamento) FROM stdin;
\.


--
-- TOC entry 4989 (class 0 OID 16655)
-- Dependencies: 230
-- Data for Name: ordenes_medicas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ordenes_medicas (id, expediente_id, folio_recibo, medico, diagnostico, lado, procedimiento, fecha, estatus, anexos, conjuntiva, cornea, camara_anterior, cristalino, retina, macula, nervio_optico, ciclopejia, hora_tp, problemas, plan, tipo, departamento, pagado, pendiente) FROM stdin;
1	1	1	Ezequiel Gomez A.	cataratas	OD	Cirugía	2025-09-08 12:13:06.13626	Pagado	Dentro de parámetros normales	Hiperemia leve	Transparente	pendiente	Opacidad nuclear moderada (catarata)	Reflejo conservado	Sin alteraciones.	pendiente de revisar	\N	12:12	Catarata	pediente de revisar	Normal	Reynosa	1500.00	0.00
\.


--
-- TOC entry 4977 (class 0 OID 16388)
-- Dependencies: 218
-- Data for Name: pacientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pacientes (id, nombre) FROM stdin;
\.


--
-- TOC entry 4979 (class 0 OID 16407)
-- Dependencies: 220
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos (id, recibo_id, monto, fecha, orden_id, expediente_id, forma_pago, departamento) FROM stdin;
1	\N	1500.00	2025-09-08	1	1	Efectivo	Reynosa
4	\N	1000.00	2025-09-08	1	1	Efectivo	Reynosa
5	\N	5000.00	2025-09-08	1	1	Efectivo	Reynosa
6	\N	500.00	2025-09-08	1	1	Efectivo	Reynosa
\.


--
-- TOC entry 4985 (class 0 OID 16507)
-- Dependencies: 226
-- Data for Name: recibos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recibos (id, fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo, departamento) FROM stdin;
3	2025-09-08	2	2	Consulta	500.00	Efectivo	200.00	Normal	Reynosa
1	2025-09-08	1	1	Cirugía	8000.00	Efectivo	8000.00	Normal	Reynosa
2	2025-09-08	1	1	Cirugía	8000.00	Efectivo	5000.00	Normal	Yucatan
\.


--
-- TOC entry 4981 (class 0 OID 16420)
-- Dependencies: 222
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, username, password, reset_token, reset_token_expire, nomina, rol, departamento) FROM stdin;
24	um	$2b$10$oWooyVsN0a3O3r9VbDopO.KrVlno6e/lVSvI6j2hltJrtD4iWZeFW	\N	\N	2468	usuario	Reynosa
25	admin	$2b$10$cQSAEAAOuw/WThrFSHkYheMw.3U5vOwvYsX.apSoRT.0pMaWGWm7G	\N	\N	1256	admin	\N
26	um2	$2b$10$4r1hbt.AK.08JAL4QBGT..CCfRxtPFVNktaHlIO/m48OdsV/PuNlS	\N	\N	1156	usuario	Yucatan
27	mty	$2b$10$E7bFRkuyi0r/F5J5PvppOOKFNtm23s6ODj5N7s.FCMYgjh5J6OhGm	\N	\N	1056	usuario	Monterrey
\.


--
-- TOC entry 5009 (class 0 OID 0)
-- Dependencies: 227
-- Name: catalogo_procedimientos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.catalogo_procedimientos_id_seq', 3, true);


--
-- TOC entry 5010 (class 0 OID 0)
-- Dependencies: 223
-- Name: expedientes_numero_expediente_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expedientes_numero_expediente_seq', 1, false);


--
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 233
-- Name: insumos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insumos_id_seq', 2, true);


--
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 231
-- Name: optometria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.optometria_id_seq', 1, false);


--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 229
-- Name: ordenes_medicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ordenes_medicas_id_seq', 1, true);


--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 217
-- Name: pacientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pacientes_id_seq', 1, false);


--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 219
-- Name: pagos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagos_id_seq', 6, true);


--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 225
-- Name: recibos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recibos_id_seq', 4, false);


--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 235
-- Name: recibos_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recibos_id_seq1', 2, true);


--
-- TOC entry 5018 (class 0 OID 0)
-- Dependencies: 221
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 27, true);


--
-- TOC entry 4820 (class 2606 OID 16597)
-- Name: catalogo_procedimientos catalogo_procedimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_procedimientos
    ADD CONSTRAINT catalogo_procedimientos_pkey PRIMARY KEY (id);


--
-- TOC entry 4814 (class 2606 OID 24726)
-- Name: expedientes expediente_unico; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expediente_unico UNIQUE (numero_expediente, departamento);


--
-- TOC entry 4816 (class 2606 OID 24674)
-- Name: expedientes expedientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_pkey PRIMARY KEY (numero_expediente, departamento);


--
-- TOC entry 4826 (class 2606 OID 16796)
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- TOC entry 4824 (class 2606 OID 16776)
-- Name: optometria optometria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optometria
    ADD CONSTRAINT optometria_pkey PRIMARY KEY (id);


--
-- TOC entry 4822 (class 2606 OID 16665)
-- Name: ordenes_medicas ordenes_medicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_medicas
    ADD CONSTRAINT ordenes_medicas_pkey PRIMARY KEY (id);


--
-- TOC entry 4804 (class 2606 OID 16393)
-- Name: pacientes pacientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pacientes
    ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id);


--
-- TOC entry 4806 (class 2606 OID 16413)
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- TOC entry 4818 (class 2606 OID 16513)
-- Name: recibos recibos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recibos
    ADD CONSTRAINT recibos_pkey PRIMARY KEY (id);


--
-- TOC entry 4808 (class 2606 OID 16449)
-- Name: usuarios usuarios_nomina_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_nomina_key UNIQUE (nomina);


--
-- TOC entry 4810 (class 2606 OID 16425)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 4812 (class 2606 OID 16427)
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- TOC entry 4830 (class 2606 OID 24680)
-- Name: optometria optometria_expediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.optometria
    ADD CONSTRAINT optometria_expediente_id_fkey FOREIGN KEY (expediente_id, departamento) REFERENCES public.expedientes(numero_expediente, departamento);


--
-- TOC entry 4828 (class 2606 OID 24675)
-- Name: ordenes_medicas ordenes_medicas_expediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_medicas
    ADD CONSTRAINT ordenes_medicas_expediente_id_fkey FOREIGN KEY (expediente_id, departamento) REFERENCES public.expedientes(numero_expediente, departamento);


--
-- TOC entry 4829 (class 2606 OID 16673)
-- Name: ordenes_medicas ordenes_medicas_folio_recibo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes_medicas
    ADD CONSTRAINT ordenes_medicas_folio_recibo_fkey FOREIGN KEY (folio_recibo) REFERENCES public.recibos(id) ON DELETE SET NULL;


--
-- TOC entry 4827 (class 2606 OID 24718)
-- Name: pagos pagos_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_medicas(id);


-- Completed on 2025-09-08 16:06:06

--
-- PostgreSQL database dump complete
--

