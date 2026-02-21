--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2026-02-21 02:43:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 900 (class 1247 OID 25686)
-- Name: discount_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.discount_type AS ENUM (
    'percent',
    'fixed'
);


ALTER TYPE public.discount_type OWNER TO postgres;

--
-- TOC entry 918 (class 1247 OID 25763)
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- TOC entry 250 (class 1255 OID 25847)
-- Name: fn_calc_order_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_calc_order_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(subtotal),0) INTO v_total FROM order_items WHERE order_id = NEW.id;
    NEW.total_amount := v_total;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_calc_order_total() OWNER TO postgres;

--
-- TOC entry 249 (class 1255 OID 25828)
-- Name: fn_get_variant_quantity(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_get_variant_quantity(p_variant_id bigint) RETURNS TABLE(product_id bigint, variant_id bigint, initial_quantity integer, sold_quantity bigint, current_quantity bigint)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        pv.product_id,
        pv.id,
        pv.initial_quantity,
        COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
        (pv.initial_quantity - COALESCE(SUM(oi.quantity), 0))::BIGINT AS current_quantity
    FROM product_variants pv
    LEFT JOIN order_items oi
        ON oi.product_variant_id = pv.id
    LEFT JOIN orders o
        ON o.id = oi.order_id
    WHERE pv.id = p_variant_id
      AND (o.status IS NULL OR o.status NOT IN ('cancelled')) -- only count non-cancelled items
    GROUP BY pv.product_id, pv.id, pv.initial_quantity;
END;
$$;


ALTER FUNCTION public.fn_get_variant_quantity(p_variant_id bigint) OWNER TO postgres;

--
-- TOC entry 248 (class 1255 OID 25824)
-- Name: trg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 25578)
-- Name: brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.brands (
    id bigint NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public.brands OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25577)
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.brands_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.brands_id_seq OWNER TO postgres;

--
-- TOC entry 5095 (class 0 OID 0)
-- Dependencies: 219
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- TOC entry 218 (class 1259 OID 25567)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 25566)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- TOC entry 5096 (class 0 OID 0)
-- Dependencies: 217
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- TOC entry 239 (class 1259 OID 25751)
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id bigint NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    address text,
    city text,
    postal_code text,
    country text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 25750)
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- TOC entry 5097 (class 0 OID 0)
-- Dependencies: 238
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- TOC entry 226 (class 1259 OID 25611)
-- Name: colors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.colors (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.colors OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25610)
-- Name: colors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.colors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.colors_id_seq OWNER TO postgres;

--
-- TOC entry 5098 (class 0 OID 0)
-- Dependencies: 225
-- Name: colors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.colors_id_seq OWNED BY public.colors.id;


--
-- TOC entry 233 (class 1259 OID 25704)
-- Name: discount_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discount_products (
    discount_id bigint NOT NULL,
    product_id bigint NOT NULL
);


ALTER TABLE public.discount_products OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 25692)
-- Name: discounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discounts (
    id bigint NOT NULL,
    name text NOT NULL,
    type public.discount_type NOT NULL,
    value numeric(10,2) NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discounts_value_check CHECK ((value >= (0)::numeric))
);


ALTER TABLE public.discounts OWNER TO postgres;

--
-- TOC entry 5099 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE discounts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.discounts IS 'Discounts may be linked to products via discount_products';


--
-- TOC entry 231 (class 1259 OID 25691)
-- Name: discounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discounts_id_seq OWNER TO postgres;

--
-- TOC entry 5100 (class 0 OID 0)
-- Dependencies: 231
-- Name: discounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discounts_id_seq OWNED BY public.discounts.id;


--
-- TOC entry 222 (class 1259 OID 25589)
-- Name: genders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.genders (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.genders OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25588)
-- Name: genders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.genders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.genders_id_seq OWNER TO postgres;

--
-- TOC entry 5101 (class 0 OID 0)
-- Dependencies: 221
-- Name: genders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.genders_id_seq OWNED BY public.genders.id;


--
-- TOC entry 243 (class 1259 OID 25802)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_variant_id bigint NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 25801)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- TOC entry 5102 (class 0 OID 0)
-- Dependencies: 242
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- TOC entry 241 (class 1259 OID 25778)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    client_id bigint,
    created_by bigint,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    payment_method text,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 25777)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- TOC entry 5103 (class 0 OID 0)
-- Dependencies: 240
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- TOC entry 230 (class 1259 OID 25650)
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    size_id bigint,
    color_id bigint,
    sku text,
    price numeric(10,2) NOT NULL,
    initial_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT product_variants_initial_quantity_check CHECK ((initial_quantity >= 0)),
    CONSTRAINT product_variants_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- TOC entry 5104 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE product_variants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.product_variants IS 'Each variant indicates size+color SKU, price and initial stock';


--
-- TOC entry 229 (class 1259 OID 25649)
-- Name: product_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_variants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_variants_id_seq OWNER TO postgres;

--
-- TOC entry 5105 (class 0 OID 0)
-- Dependencies: 229
-- Name: product_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_variants_id_seq OWNED BY public.product_variants.id;


--
-- TOC entry 228 (class 1259 OID 25622)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    name text NOT NULL,
    description text,
    category_id bigint,
    brand_id bigint,
    gender_id bigint,
    default_price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT products_default_price_check CHECK ((default_price >= (0)::numeric))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 5106 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE products; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.products IS 'General product info. Price per variant is in product_variants.price';


--
-- TOC entry 227 (class 1259 OID 25621)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 5107 (class 0 OID 0)
-- Dependencies: 227
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 235 (class 1259 OID 25720)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 25719)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5108 (class 0 OID 0)
-- Dependencies: 234
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 224 (class 1259 OID 25600)
-- Name: sizes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sizes (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.sizes OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25599)
-- Name: sizes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sizes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sizes_id_seq OWNER TO postgres;

--
-- TOC entry 5109 (class 0 OID 0)
-- Dependencies: 223
-- Name: sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sizes_id_seq OWNED BY public.sizes.id;


--
-- TOC entry 237 (class 1259 OID 25731)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username text NOT NULL,
    email text,
    password_hash text NOT NULL,
    role_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25730)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5110 (class 0 OID 0)
-- Dependencies: 236
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 245 (class 1259 OID 25834)
-- Name: vw_daily_earnings; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_daily_earnings AS
 SELECT date_trunc('day'::text, created_at) AS day,
    count(id) AS orders_count,
    sum(total_amount) AS earnings
   FROM public.orders o
  WHERE (status <> 'cancelled'::public.order_status)
  GROUP BY (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC;


ALTER VIEW public.vw_daily_earnings OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 25838)
-- Name: vw_monthly_earnings; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_monthly_earnings AS
 SELECT date_trunc('month'::text, created_at) AS month,
    count(id) AS orders_count,
    sum(total_amount) AS earnings
   FROM public.orders o
  WHERE (status <> 'cancelled'::public.order_status)
  GROUP BY (date_trunc('month'::text, created_at))
  ORDER BY (date_trunc('month'::text, created_at)) DESC;


ALTER VIEW public.vw_monthly_earnings OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 25829)
-- Name: vw_product_stock; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_product_stock AS
 SELECT pv.id AS variant_id,
    p.id AS product_id,
    p.name AS product_name,
    c.name AS category,
    b.name AS brand,
    g.name AS gender,
    s.name AS size,
    col.name AS color,
    pv.sku,
    pv.price,
    pv.initial_quantity,
    COALESCE(sold.sold_quantity, (0)::bigint) AS sold_quantity,
    (pv.initial_quantity - COALESCE(sold.sold_quantity, (0)::bigint)) AS current_quantity
   FROM (((((((public.product_variants pv
     JOIN public.products p ON ((p.id = pv.product_id)))
     LEFT JOIN public.categories c ON ((c.id = p.category_id)))
     LEFT JOIN public.brands b ON ((b.id = p.brand_id)))
     LEFT JOIN public.genders g ON ((g.id = p.gender_id)))
     LEFT JOIN public.sizes s ON ((s.id = pv.size_id)))
     LEFT JOIN public.colors col ON ((col.id = pv.color_id)))
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(oi.quantity), (0)::bigint) AS sold_quantity
           FROM (public.order_items oi
             JOIN public.orders o ON ((o.id = oi.order_id)))
          WHERE ((oi.product_variant_id = pv.id) AND (o.status <> 'cancelled'::public.order_status))) sold ON (true));


ALTER VIEW public.vw_product_stock OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 25842)
-- Name: vw_top_selling_products; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vw_top_selling_products AS
 SELECT pv.product_id,
    p.name AS product_name,
    pv.id AS variant_id,
    pv.sku,
    sum(oi.quantity) AS total_sold,
    sum(oi.subtotal) AS revenue
   FROM (((public.order_items oi
     JOIN public.product_variants pv ON ((pv.id = oi.product_variant_id)))
     JOIN public.orders o ON ((o.id = oi.order_id)))
     JOIN public.products p ON ((p.id = pv.product_id)))
  WHERE (o.status <> 'cancelled'::public.order_status)
  GROUP BY pv.product_id, p.name, pv.id, pv.sku
  ORDER BY (sum(oi.quantity)) DESC;


ALTER VIEW public.vw_top_selling_products OWNER TO postgres;

--
-- TOC entry 4832 (class 2604 OID 25581)
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- TOC entry 4831 (class 2604 OID 25570)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- TOC entry 4852 (class 2604 OID 25754)
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- TOC entry 4835 (class 2604 OID 25614)
-- Name: colors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors ALTER COLUMN id SET DEFAULT nextval('public.colors_id_seq'::regclass);


--
-- TOC entry 4844 (class 2604 OID 25695)
-- Name: discounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts ALTER COLUMN id SET DEFAULT nextval('public.discounts_id_seq'::regclass);


--
-- TOC entry 4833 (class 2604 OID 25592)
-- Name: genders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genders ALTER COLUMN id SET DEFAULT nextval('public.genders_id_seq'::regclass);


--
-- TOC entry 4859 (class 2604 OID 25805)
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- TOC entry 4854 (class 2604 OID 25781)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 4840 (class 2604 OID 25653)
-- Name: product_variants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants ALTER COLUMN id SET DEFAULT nextval('public.product_variants_id_seq'::regclass);


--
-- TOC entry 4836 (class 2604 OID 25625)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 4848 (class 2604 OID 25723)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4834 (class 2604 OID 25603)
-- Name: sizes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sizes ALTER COLUMN id SET DEFAULT nextval('public.sizes_id_seq'::regclass);


--
-- TOC entry 4849 (class 2604 OID 25734)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4874 (class 2606 OID 25587)
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- TOC entry 4876 (class 2606 OID 25585)
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- TOC entry 4870 (class 2606 OID 25576)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 4872 (class 2606 OID 25574)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4915 (class 2606 OID 25761)
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- TOC entry 4917 (class 2606 OID 25759)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4886 (class 2606 OID 25620)
-- Name: colors colors_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_name_key UNIQUE (name);


--
-- TOC entry 4888 (class 2606 OID 25618)
-- Name: colors colors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY (id);


--
-- TOC entry 4903 (class 2606 OID 25708)
-- Name: discount_products discount_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_products
    ADD CONSTRAINT discount_products_pkey PRIMARY KEY (discount_id, product_id);


--
-- TOC entry 4901 (class 2606 OID 25703)
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- TOC entry 4878 (class 2606 OID 25598)
-- Name: genders genders_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genders
    ADD CONSTRAINT genders_name_key UNIQUE (name);


--
-- TOC entry 4880 (class 2606 OID 25596)
-- Name: genders genders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genders
    ADD CONSTRAINT genders_pkey PRIMARY KEY (id);


--
-- TOC entry 4923 (class 2606 OID 25811)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 25790)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4897 (class 2606 OID 25662)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 4899 (class 2606 OID 25664)
-- Name: product_variants product_variants_product_id_size_id_color_id_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_size_id_color_id_sku_key UNIQUE (product_id, size_id, color_id, sku);


--
-- TOC entry 4893 (class 2606 OID 25633)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4905 (class 2606 OID 25729)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 4907 (class 2606 OID 25727)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4882 (class 2606 OID 25609)
-- Name: sizes sizes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_name_key UNIQUE (name);


--
-- TOC entry 4884 (class 2606 OID 25607)
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 4909 (class 2606 OID 25744)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4911 (class 2606 OID 25740)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4913 (class 2606 OID 25742)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4920 (class 1259 OID 25822)
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- TOC entry 4921 (class 1259 OID 25823)
-- Name: idx_order_items_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_variant ON public.order_items USING btree (product_variant_id);


--
-- TOC entry 4889 (class 1259 OID 25681)
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand_id);


--
-- TOC entry 4890 (class 1259 OID 25680)
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- TOC entry 4891 (class 1259 OID 25682)
-- Name: idx_products_gender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_gender ON public.products USING btree (gender_id);


--
-- TOC entry 4894 (class 1259 OID 25683)
-- Name: idx_variants_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variants_product ON public.product_variants USING btree (product_id);


--
-- TOC entry 4895 (class 1259 OID 25684)
-- Name: idx_variants_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variants_sku ON public.product_variants USING btree (sku);


--
-- TOC entry 4939 (class 2620 OID 25848)
-- Name: orders trg_orders_calc_total; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_orders_calc_total BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.fn_calc_order_total();


--
-- TOC entry 4940 (class 2620 OID 25827)
-- Name: orders trg_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


--
-- TOC entry 4937 (class 2620 OID 25825)
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


--
-- TOC entry 4938 (class 2620 OID 25826)
-- Name: product_variants trg_variants_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


--
-- TOC entry 4930 (class 2606 OID 25709)
-- Name: discount_products discount_products_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_products
    ADD CONSTRAINT discount_products_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 25714)
-- Name: discount_products discount_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_products
    ADD CONSTRAINT discount_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4935 (class 2606 OID 25812)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4936 (class 2606 OID 25817)
-- Name: order_items order_items_product_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;


--
-- TOC entry 4933 (class 2606 OID 25791)
-- Name: orders orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- TOC entry 4934 (class 2606 OID 25796)
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4927 (class 2606 OID 25675)
-- Name: product_variants product_variants_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE SET NULL;


--
-- TOC entry 4928 (class 2606 OID 25665)
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 4929 (class 2606 OID 25670)
-- Name: product_variants product_variants_size_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- TOC entry 4924 (class 2606 OID 25639)
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- TOC entry 4925 (class 2606 OID 25634)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4926 (class 2606 OID 25644)
-- Name: products products_gender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_gender_id_fkey FOREIGN KEY (gender_id) REFERENCES public.genders(id) ON DELETE SET NULL;


--
-- TOC entry 4932 (class 2606 OID 25745)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


-- Completed on 2026-02-21 02:43:27

--
-- PostgreSQL database dump complete
--

