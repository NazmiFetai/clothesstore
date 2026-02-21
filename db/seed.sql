--
-- PostgreSQL database dump
--
-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4
--

-- Make imports stable across Postgres 16/17
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- NOTE: Postgres 16 does NOT support transaction_timeout, so DO NOT set it
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Force schema
SELECT pg_catalog.set_config('search_path', 'public', false);

SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Disable triggers/constraints during COPY to avoid trigger errors while loading
SET session_replication_role = replica;
--
-- TOC entry 5055 (class 0 OID 25578)
-- Dependencies: 220
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.brands (id, name, description) FROM stdin;
1	Nike	Sportswear
2	Adidas	Athletic clothing
3	Zara	Fast fashion
4	Tommy Hilfiger	Premium casual wear
5	Puma	Sports clothing
6	H&M	Affordable fashion
\.


--
-- TOC entry 5053 (class 0 OID 25567)
-- Dependencies: 218
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, description) FROM stdin;
3	Jackets	Winter and light jackets
4	Shoes	Sneakers, boots, sandals
5	Accessories	Belts, hats, watches
11	Underwear	Category
14	SOCKS	Category
\.


--
-- TOC entry 5074 (class 0 OID 25751)
-- Dependencies: 239
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, first_name, last_name, email, phone, address, city, postal_code, country, created_at) FROM stdin;
1	John	Doe	john@example.com	123456789	Street 1	Skopje	1000	North Macedonia	2025-11-22 16:36:57.530916+01
2	Maria	Petrova	maria@example.com	987654321	Street 2	Tetovo	1200	North Macedonia	2025-11-22 16:36:57.530916+01
3	Moris	Moris	moris@gmail.com	123123123	addr	City	123	count	2025-11-28 17:22:13.715346+01
4	xadsad	adssad	new@example.com	21321412412	dsadas	safgdssfhsf	124323	dsfvsdv	2026-02-05 01:38:21.937377+01
5	naki	naki	naki@example.com	123456789	asas	asasa	111	asdasd	2026-02-06 01:05:14.046944+01
\.


--
-- TOC entry 5061 (class 0 OID 25611)
-- Dependencies: 226
-- Data for Name: colors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.colors (id, name) FROM stdin;
1	Black
2	White
3	Red
4	Blue
5	Green
6	Gray
\.


--
-- TOC entry 5067 (class 0 OID 25692)
-- Dependencies: 232
-- Data for Name: discounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discounts (id, name, type, value, start_date, end_date, active, created_at) FROM stdin;
20	Socks	percent	100.00	2026-02-06	2026-02-08	t	2026-02-06 00:10:31.122254+01
21	Socks	percent	50.00	2026-02-07	2026-02-07	t	2026-02-07 17:40:56.132618+01
\.


--
-- TOC entry 5057 (class 0 OID 25589)
-- Dependencies: 222
-- Data for Name: genders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.genders (id, name) FROM stdin;
1	Men
2	Women
3	Children
4	Unisex
\.


--
-- TOC entry 5063 (class 0 OID 25622)
-- Dependencies: 228
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, category_id, brand_id, gender_id, default_price, active, created_at, updated_at, deleted_at) FROM stdin;
4	Puma Running Shoes	Lightweight running shoes	4	5	4	60.00	t	2025-11-22 16:36:57.530916+01	2025-11-22 16:36:57.530916+01	\N
29	GraphQL hoodie	Created via GraphQL from Postman	3	2	1	149.00	t	2026-02-19 01:18:41.761101+01	2026-02-19 13:37:48.170659+01	\N
6	Test Product	Desc	\N	1	1	19.99	t	2025-11-23 19:22:14.729102+01	2025-11-23 20:49:02.162787+01	\N
11	Shoes	Shoes	3	2	1	120.00	t	2025-11-24 01:24:41.736675+01	2025-11-24 01:24:41.736675+01	\N
16	h&m	clothes	11	\N	1	8.99	t	2025-11-27 20:32:56.197411+01	2025-11-27 20:32:56.197411+01	\N
12	Socks	Short and long	3	2	1	120.00	t	2025-11-27 18:10:02.86569+01	2025-11-27 20:43:46.446831+01	2025-11-27 20:43:46.446831
30	GraphQL hoodie	Created via GraphQL from Postman	3	2	1	149.00	t	2026-02-19 13:28:25.563647+01	2026-02-19 13:38:05.038409+01	\N
31	GraphQL hoodie	Created via GraphQL from Postman	3	2	1	149.00	t	2026-02-19 14:22:55.373077+01	2026-02-19 14:22:55.373077+01	\N
20	testing	dse	3	5	2	45.00	t	2025-11-28 18:23:09.397555+01	2025-11-28 18:26:58.561188+01	\N
19	Philips Morise	PS	3	5	1	25.00	t	2025-11-28 18:12:34.134534+01	2025-11-28 18:33:03.400382+01	\N
5	Test Product	Desc	\N	1	1	19.99	t	2025-11-23 19:14:19.317798+01	2025-11-28 21:47:16.691321+01	2025-11-28 21:47:16.691321
2	Adiddas	Warm hoodie for training and casual wear	3	2	2	45.00	t	2025-11-22 16:36:57.530916+01	2025-11-28 22:46:49.173293+01	\N
21	Socks	Short and long	3	2	1	120.00	t	2025-11-28 21:32:59.514796+01	2025-11-28 22:47:36.933254+01	2025-11-28 22:47:36.933254
3	Zara Jeans	Slim fit casual jeans	\N	3	1	35.00	t	2025-11-22 16:36:57.530916+01	2025-11-28 22:51:19.753694+01	\N
18	zara	jackets	\N	3	2	55.00	t	2025-11-27 20:36:23.100479+01	2025-11-28 22:51:19.753694+01	\N
24	h&m	socks	3	3	2	5.00	t	2026-02-07 02:57:07.170333+01	2026-02-07 02:57:07.170333+01	\N
22	Socks (Updated via GraphQL)	Updated via GraphQL	3	2	1	130.00	t	2025-11-28 22:45:36.799771+01	2026-02-07 16:52:57.281012+01	2026-02-07 16:52:57.281012
25	GraphQL Test Product	Created via GraphQL	3	2	1	199.00	t	2026-02-07 16:51:25.728247+01	2026-02-07 17:37:56.870503+01	\N
26	New Jacket	Winter jacket	3	2	1	199.90	t	2026-02-07 20:55:47.374861+01	2026-02-07 20:55:47.374861+01	\N
27	GraphQL Jacket	Created via GraphQL from Postman	3	2	1	149.00	t	2026-02-07 21:12:28.920508+01	2026-02-07 21:12:28.920508+01	\N
28	GraphQL hoodie	Created via GraphQL from Postman	3	2	1	149.00	t	2026-02-07 23:15:33.652796+01	2026-02-07 23:15:33.652796+01	\N
1	Renamed Product	Updated from Postman	\N	1	1	123.45	t	2025-11-22 16:36:57.530916+01	2026-02-19 13:32:51.980441+01	2026-02-19 13:32:51.980441
\.


--
-- TOC entry 5068 (class 0 OID 25704)
-- Dependencies: 233
-- Data for Name: discount_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discount_products (discount_id, product_id) FROM stdin;
20	1
21	3
\.


--
-- TOC entry 5070 (class 0 OID 25720)
-- Dependencies: 235
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
1	admin
2	advanced_user
3	simple_user
\.


--
-- TOC entry 5072 (class 0 OID 25731)
-- Dependencies: 237
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role_id, is_active, created_at, last_login) FROM stdin;
2	advanced	advanced@example.com	hashed_password	2	t	2025-11-22 16:36:57.530916+01	\N
3	simple	simple@example.com	hashed_password	3	t	2025-11-22 16:36:57.530916+01	\N
6	admin3	admin3@store.com	$2b$10$8VlW7x1YgnPZXoqBYwyg0u0zbCwJ1U8BqHoYBeVqtnz/1QLPW07iK	1	t	2025-11-23 18:32:27.722161+01	\N
7	naki	new@example.com	$2b$10$zD7pJ29Z7CtA3BgMcmPKVuotCng568B/BJ3hohC888.kIEU7OezBO	1	t	2025-11-23 18:42:52.20617+01	\N
9	ensar	u1@example.com	$2b$10$5qYXySYYsXyAFXbDIThQLeOLiCuLROr7ZrqpAGftlnA5QbCJiey8m	3	t	2025-11-23 21:24:05.783958+01	\N
1	ali	alii@example.com	$2b$10$mE3BISoRpzcSUmoSOrjH3eOWboei2VxlJVGdUy8tZCTlwFEShJlLa	1	t	2025-11-22 16:36:57.530916+01	\N
13	cali	new1@example.com	$2b$10$kfq5BAMLFd1S.WhFkvfsE.MWw7O5AeeyMw3yAaQnxXNVCSUveNBgi	3	t	2025-11-28 00:04:36.343515+01	\N
23	User	admin@example.com	$2b$10$f6XeFji5VbN2yI3fPvMPqe4i40eZppT9DMnpqQkFVAOuEwhSUGYi.	3	t	2026-02-07 01:53:22.192273+01	\N
24	Aa	aa@example.com	$2b$10$u6c7bfOd.o9qJbWQN0kvBOzdJmAcsq9OZC7uEbwb5MvkveQr0hZTW	3	t	2026-02-07 21:33:57.696993+01	\N
25	Second Admin	admin2@example.com	$2b$10$i6R3rLxHBtAwmjvfrn7J8OtZVdEHODEf6nuiiBXCMhHxsW2CtCkAq	3	t	2026-02-07 21:37:57.072832+01	\N
26	nakii	w11@example.com	$2b$10$zbqWWppoyPQRGdCzgv3yFuEkjLhtiHQyhBFOz2KNNAarN6128R44G	3	t	2026-02-07 21:40:59.463986+01	\N
28	nak9ii	ww11@example.com	$2b$10$D8utDpQDY3JBNTkeqcr/P.PkgxP/UjoxDBXf.IXGiNx/O5FWFE9r2	3	t	2026-02-07 21:41:31.528606+01	\N
\.


--
-- TOC entry 5076 (class 0 OID 25778)
-- Dependencies: 241
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, client_id, created_by, status, payment_method, total_amount, created_at, updated_at) FROM stdin;
2	2	2	processing	cash	0.00	2025-11-22 16:36:57.530916+01	2025-11-22 16:36:57.530916+01
3	1	1	pending	card	50.00	2025-11-23 21:13:11.470892+01	2025-11-23 21:13:11.470892+01
5	1	1	confirmed	card	135.00	2025-11-24 01:32:06.493573+01	2026-02-07 17:17:38.784004+01
31	5	\N	confirmed	cash	95.00	2026-02-07 17:04:47.478365+01	2026-02-07 17:17:53.424912+01
6	1	1	processing	card	135.00	2025-11-27 22:05:25.444604+01	2025-11-27 22:09:21.401487+01
4	1	1	pending	card	50.00	2025-11-23 21:20:40.627028+01	2025-11-27 22:09:27.520201+01
7	1	1	cancelled	card	135.00	2025-11-27 22:14:09.490132+01	2025-11-28 00:03:36.666714+01
8	1	1	pending	card	135.00	2025-11-28 00:06:38.298218+01	2025-11-28 00:06:38.298218+01
10	1	13	pending	card	135.00	2025-11-28 00:09:58.473907+01	2025-11-28 00:09:58.473907+01
13	1	13	pending	card	135.00	2025-11-28 00:22:35.098843+01	2025-11-28 00:22:35.098843+01
14	2	13	pending	card	135.00	2025-11-28 00:22:48.763976+01	2025-11-28 00:22:48.763976+01
17	1	1	pending	card	135.00	2025-11-28 01:19:01.969742+01	2025-11-28 01:19:01.969742+01
18	2	\N	pending	card	135.00	2025-11-28 01:49:17.718815+01	2025-11-28 01:49:17.718815+01
33	4	7	cancelled	card	155.00	2026-02-07 17:38:24.329033+01	2026-02-07 17:38:41.373191+01
20	2	2	cancelled	card	135.00	2025-11-28 01:52:00.509461+01	2025-11-28 02:11:03.848295+01
34	5	\N	processing	cash	95.00	2026-02-07 20:57:15.616329+01	2026-02-07 21:04:58.405196+01
19	2	1	confirmed	card	135.00	2025-11-28 01:51:31.682337+01	2025-11-28 18:41:08.344338+01
23	2	2	pending	card	135.00	2025-11-28 22:07:15.465897+01	2025-11-28 22:07:15.465897+01
21	3	\N	confirmed	card	135.00	2025-11-28 17:22:13.725565+01	2025-11-28 22:16:40.300424+01
22	3	\N	confirmed	card	180.00	2025-11-28 17:39:00.937585+01	2025-11-28 22:16:40.300424+01
1	1	1	processing	credit_card	85.00	2025-11-22 16:36:57.530916+01	2025-11-28 22:25:02.477052+01
24	2	2	pending	card	135.00	2025-11-28 22:56:43.995693+01	2025-11-28 22:56:43.995693+01
25	4	7	pending	card	70.00	2026-02-05 01:38:21.950764+01	2026-02-05 01:38:21.950764+01
27	4	7	processing	card	35.00	2026-02-05 02:20:46.447313+01	2026-02-05 23:00:08.388984+01
26	4	7	cancelled	card	35.00	2026-02-05 02:08:48.052785+01	2026-02-05 23:00:22.821454+01
30	5	\N	cancelled	cash	95.00	2026-02-06 01:30:39.336496+01	2026-02-06 02:01:20.141133+01
28	5	\N	confirmed	cash	95.00	2026-02-06 01:05:14.049218+01	2026-02-06 02:01:22.793171+01
\.


--
-- TOC entry 5059 (class 0 OID 25600)
-- Dependencies: 224
-- Data for Name: sizes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sizes (id, name) FROM stdin;
1	XS
2	S
3	M
4	L
5	XL
6	XXL
\.


--
-- TOC entry 5065 (class 0 OID 25650)
-- Dependencies: 230
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, product_id, size_id, color_id, sku, price, initial_quantity, created_at, updated_at, deleted_at) FROM stdin;
2	1	4	2	NIKE-TSHIRT-L-WHT	25.00	80	2025-11-22 16:36:57.530916+01	2025-11-23 20:16:26.158761+01	2025-11-23 20:16:26.158761
5	3	3	4	ZARA-JEANS-M-BLU	35.00	58	2025-11-22 16:36:57.530916+01	2025-11-27 21:14:52.251454+01	\N
6	4	4	1	PUMA-SHOES-L-BLK	60.00	37	2025-11-22 16:36:57.530916+01	2025-11-28 17:39:26.285202+01	\N
7	19	4	1	1234	25.00	50	2025-11-28 18:31:54.420675+01	2025-11-28 18:33:03.400382+01	\N
8	19	2	1	50	100.00	25	2025-11-28 18:33:03.400382+01	2025-11-28 18:33:03.400382+01	\N
4	2	3	6	ADI-HOODIE-M-GRY	45.00	28	2025-11-22 16:36:57.530916+01	2025-11-28 21:37:44.679687+01	\N
9	18	2	1	ZARA-JACKETS-M-BLK	55.00	10	2026-02-05 23:14:55.375482+01	2026-02-05 23:14:55.375482+01	\N
10	22	4	1	\N	120.00	0	2026-02-06 00:11:28.739254+01	2026-02-06 00:11:28.739254+01	\N
1	1	3	1	NIKE-TSHIRT-M-BLK	25.00	84	2025-11-22 16:36:57.530916+01	2026-02-07 17:23:16.897007+01	2025-11-23 20:16:26.158761
3	2	2	4	ADI-HOODIE-S-BLU	45.00	28	2025-11-22 16:36:57.530916+01	2026-02-07 17:23:16.897007+01	\N
12	29	4	1	\N	149.00	3	2026-02-19 13:37:48.170659+01	2026-02-19 13:37:48.170659+01	\N
11	30	4	1	\N	149.00	5	2026-02-19 13:37:35.149186+01	2026-02-19 13:38:05.038409+01	\N
13	30	3	1	\N	149.00	3	2026-02-19 13:38:05.038409+01	2026-02-19 13:38:05.038409+01	\N
\.


--
-- TOC entry 5078 (class 0 OID 25802)
-- Dependencies: 243
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_variant_id, unit_price, quantity, subtotal, created_at) FROM stdin;
1	1	1	25.00	2	50.00	2025-11-22 16:36:57.530916+01
2	1	5	35.00	1	35.00	2025-11-22 16:36:57.530916+01
3	2	4	45.00	1	45.00	2025-11-22 16:36:57.530916+01
4	3	1	25.00	2	50.00	2025-11-23 21:13:11.470892+01
5	4	1	25.00	2	50.00	2025-11-23 21:20:40.627028+01
6	5	3	45.00	3	135.00	2025-11-24 01:32:06.493573+01
7	6	3	45.00	3	135.00	2025-11-27 22:05:25.444604+01
8	7	3	45.00	3	135.00	2025-11-27 22:14:09.490132+01
9	8	3	45.00	3	135.00	2025-11-28 00:06:38.298218+01
10	10	3	45.00	3	135.00	2025-11-28 00:09:58.473907+01
11	13	3	45.00	3	135.00	2025-11-28 00:22:35.098843+01
12	14	3	45.00	3	135.00	2025-11-28 00:22:48.763976+01
13	17	3	45.00	3	135.00	2025-11-28 01:19:01.969742+01
14	18	3	45.00	3	135.00	2025-11-28 01:49:17.718815+01
15	19	3	45.00	3	135.00	2025-11-28 01:51:31.682337+01
16	20	3	45.00	3	135.00	2025-11-28 01:52:00.509461+01
17	21	4	45.00	2	90.00	2025-11-28 17:22:13.725565+01
18	21	3	45.00	1	45.00	2025-11-28 17:22:13.725565+01
19	22	6	60.00	3	180.00	2025-11-28 17:39:00.937585+01
20	23	3	45.00	3	135.00	2025-11-28 22:07:15.465897+01
21	24	3	45.00	3	135.00	2025-11-28 22:56:43.995693+01
22	25	5	35.00	2	70.00	2026-02-05 01:38:21.950764+01
23	26	5	35.00	1	35.00	2026-02-05 02:08:48.052785+01
24	27	5	35.00	1	35.00	2026-02-05 02:20:46.447313+01
25	28	1	25.00	2	50.00	2026-02-06 01:05:14.049218+01
26	28	3	45.00	1	45.00	2026-02-06 01:05:14.049218+01
29	30	1	25.00	2	50.00	2026-02-06 01:30:39.336496+01
30	30	3	45.00	1	45.00	2026-02-06 01:30:39.336496+01
31	31	1	25.00	2	50.00	2026-02-07 17:04:47.478365+01
32	31	3	45.00	1	45.00	2026-02-07 17:04:47.478365+01
35	33	10	120.00	1	120.00	2026-02-07 17:38:24.329033+01
36	33	5	35.00	1	35.00	2026-02-07 17:38:24.329033+01
37	34	1	25.00	2	50.00	2026-02-07 20:57:15.616329+01
38	34	3	45.00	1	45.00	2026-02-07 20:57:15.616329+01
\.


--
-- TOC entry 5084 (class 0 OID 0)
-- Dependencies: 219
-- Name: brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.brands_id_seq', 6, true);


--
-- TOC entry 5085 (class 0 OID 0)
-- Dependencies: 217
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 14, true);


--
-- TOC entry 5086 (class 0 OID 0)
-- Dependencies: 238
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 5, true);


--
-- TOC entry 5087 (class 0 OID 0)
-- Dependencies: 225
-- Name: colors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.colors_id_seq', 6, true);


--
-- TOC entry 5088 (class 0 OID 0)
-- Dependencies: 231
-- Name: discounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discounts_id_seq', 21, true);


--
-- TOC entry 5089 (class 0 OID 0)
-- Dependencies: 221
-- Name: genders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.genders_id_seq', 4, true);


--
-- TOC entry 5090 (class 0 OID 0)
-- Dependencies: 242
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 38, true);


--
-- TOC entry 5091 (class 0 OID 0)
-- Dependencies: 240
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 34, true);


--
-- TOC entry 5092 (class 0 OID 0)
-- Dependencies: 229
-- Name: product_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_variants_id_seq', 13, true);


--
-- TOC entry 5093 (class 0 OID 0)
-- Dependencies: 227
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 31, true);


--
-- TOC entry 5094 (class 0 OID 0)
-- Dependencies: 234
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- TOC entry 5095 (class 0 OID 0)
-- Dependencies: 223
-- Name: sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sizes_id_seq', 6, true);


--
-- TOC entry 5096 (class 0 OID 0)
-- Dependencies: 236
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 29, true);


-- Completed on 2026-02-21 02:44:06

--
-- PostgreSQL database dump complete
--
SET session_replication_role = origin;
