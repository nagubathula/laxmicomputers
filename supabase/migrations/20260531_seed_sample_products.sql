-- =============================================================================
-- Sample product seed — Laxmi Computers
-- 12 products across 4 categories with opening stock movements
-- =============================================================================

do $seed$
declare
  p uuid;
begin

-- ---------------------------------------------------------------------------
-- LAPTOPS
-- ---------------------------------------------------------------------------

insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty)
values (
  'ASUS TUF Gaming F15 FX507ZC4',
  'High-performance gaming laptop powered by Intel Core i5-12500H and NVIDIA RTX 3050. Features a 144Hz IPS display, military-grade MIL-STD-810H durability, and PCIe Gen 4 SSD storage.',
  74990, 65000, 'laptops',
  '["Intel Core i5-12500H", "NVIDIA RTX 3050 4GB GDDR6", "16GB DDR4 3200MHz", "512GB PCIe Gen4 NVMe SSD", "15.6\" FHD 144Hz IPS", "Windows 11 Home"]'::jsonb,
  '8471', 18, 2, false, 0
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 5, 'opening', 'Initial opening stock');
update public.products set stock_qty = 5 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty)
values (
  'HP Pavilion 15 AMD Ryzen 5 Laptop',
  'Slim and lightweight everyday laptop with AMD Ryzen 5 processor. Perfect for students, home use, and light office work with fast boot and long battery life.',
  46990, 40500, 'laptops',
  '["AMD Ryzen 5 7530U", "AMD Radeon Integrated Graphics", "8GB DDR4 RAM", "512GB PCIe SSD", "15.6\" FHD Anti-glare", "Windows 11 Home", "Finger Print Reader"]'::jsonb,
  '8471', 18, 3, false, 0
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 8, 'opening', 'Initial opening stock');
update public.products set stock_qty = 8 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'Lenovo ThinkPad E14 Gen 5 Business Laptop',
  'Professional business laptop engineered for reliability and productivity. Spill-resistant keyboard, MIL-SPEC tested, and optimised for enterprise IT management.',
  68990, 60000, 'laptops',
  '["AMD Ryzen 5 7530U", "AMD Radeon Integrated", "16GB DDR4 RAM", "512GB NVMe SSD", "14\" FHD IPS 300nits", "Windows 11 Pro", "IR Camera + FPR", "MIL-SPEC 810H"]'::jsonb,
  '8471', 18, 2, false, 0, '8901030837948'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 4, 'opening', 'Initial opening stock');
update public.products set stock_qty = 4 where id = p;


-- ---------------------------------------------------------------------------
-- GRAPHICS CARDS
-- ---------------------------------------------------------------------------

insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'ASUS Dual GeForce RTX 4060 OC Edition 8GB',
  'Mid-range powerhouse GPU delivering excellent 1080p and solid 1440p gaming. DLSS 3 Frame Generation and AV1 encoding make it the best value Ada Lovelace card.',
  32999, 28500, 'graphics-cards',
  '["8GB GDDR6 128-bit", "PCIe 4.0 x8", "DLSS 3 + Frame Gen", "AV1 Encode/Decode", "2x HDMI 2.1", "3x DisplayPort 1.4a", "Dual Axial Fans"]'::jsonb,
  '8473', 18, 2, false, 0, '4711081825951'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 6, 'opening', 'Initial opening stock');
update public.products set stock_qty = 6 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty)
values (
  'Sapphire PULSE AMD Radeon RX 7600 8GB',
  'Compact and efficient RDNA 3 GPU ideal for 1080p ultra gaming. AV1 hardware encode, DisplayPort 2.1, and low power draw make it a smart budget pick.',
  24999, 21000, 'graphics-cards',
  '["8GB GDDR6 128-bit", "PCIe 4.0 x8", "RDNA 3 Architecture", "AV1 Hardware Encode", "2x HDMI 2.1", "2x DisplayPort 2.1", "Dual Fan Cooling"]'::jsonb,
  '8473', 18, 2, false, 0
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 4, 'opening', 'Initial opening stock');
update public.products set stock_qty = 4 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'MSI VENTUS 3X OC GeForce RTX 4070 12GB',
  'High-end Ada Lovelace GPU for demanding 1440p and 4K gaming. DLSS 3 Frame Generation triples effective frame rates, triple-fan cooling for silent operation.',
  54999, 47000, 'graphics-cards',
  '["12GB GDDR6X 192-bit", "PCIe 4.0 x16", "DLSS 3 + Frame Gen", "Ada Lovelace Architecture", "HDMI 2.1", "3x DisplayPort 1.4a", "Triple TORX Fan 5.0"]'::jsonb,
  '8473', 18, 1, false, 0, '4719072907433'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 3, 'opening', 'Initial opening stock');
update public.products set stock_qty = 3 where id = p;


-- ---------------------------------------------------------------------------
-- COMPONENTS
-- ---------------------------------------------------------------------------

insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'Kingston FURY Beast 16GB DDR5-5200 Kit (2×8GB)',
  'High-speed DDR5 dual-channel memory kit optimised for Intel 12th/13th Gen platforms. XMP 3.0 one-click overclocking with aggressive heat spreader design.',
  6499, 5600, 'components',
  '["16GB Kit (2×8GB)", "DDR5-5200 MHz", "CL40-40-40", "XMP 3.0 Support", "Intel Optimized", "On-Die ECC", "Plug N Play"]'::jsonb,
  '8473', 18, 5, false, 0, '0740617327298'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 15, 'opening', 'Initial opening stock');
update public.products set stock_qty = 15 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'Samsung 970 EVO Plus 1TB NVMe SSD',
  'Industry-leading NVMe SSD with V-NAND technology delivering exceptional read/write speeds. Ideal OS drive for gaming PCs, workstations, and creative workflows.',
  7499, 6300, 'components',
  '["1TB Capacity", "NVMe PCIe Gen 3.0 x4", "Sequential Read: 3500 MB/s", "Sequential Write: 3300 MB/s", "V-NAND MLC", "M.2 2280 Form Factor", "5-Year Warranty"]'::jsonb,
  '8471', 18, 5, false, 0, '8806090312366'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 12, 'opening', 'Initial opening stock');
update public.products set stock_qty = 12 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'Intel Core i5-13400 Desktop Processor',
  'Raptor Lake 10-core processor combining Performance and Efficient cores for excellent gaming and multi-tasking. Drop-in upgrade for LGA1700 Z690/B660/H670 motherboards.',
  17999, 15500, 'components',
  '["10 Cores (6P + 4E)", "16 Threads", "Base: 2.5 GHz / Boost: 4.6 GHz", "LGA1700 Socket", "20MB Intel Smart Cache", "Intel UHD 730 Graphics", "65W TDP"]'::jsonb,
  '8473', 18, 2, false, 0, '0735858536059'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 5, 'opening', 'Initial opening stock');
update public.products set stock_qty = 5 where id = p;


-- ---------------------------------------------------------------------------
-- PERIPHERALS
-- ---------------------------------------------------------------------------

insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'Logitech MK235 Wireless Keyboard & Mouse Combo',
  'Reliable full-size wireless keyboard and mouse designed for everyday home and office use. Nano USB receiver, spill-resistant keyboard, and up to 36-month battery life.',
  1795, 1400, 'peripherals',
  '["Wireless 2.4 GHz", "10m Operating Range", "Spill-Resistant Keyboard", "3-Button Optical Mouse", "Single USB Nano Receiver", "Battery: Up to 36 months (KB), 12 months (Mouse)"]'::jsonb,
  '8471', 18, 8, false, 0, '5099206064188'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 20, 'opening', 'Initial opening stock');
update public.products set stock_qty = 20 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty)
values (
  'BenQ GW2480 24" 1080p Eye-Care IPS Monitor',
  'Professional FHD IPS monitor with BenQ Eye-Care technology including Low Blue Light and Flicker-Free for all-day comfortable viewing. Slim bezel design for multi-monitor setups.',
  14499, 12000, 'peripherals',
  '["24\" FHD 1920×1080", "IPS Panel", "75Hz Refresh Rate", "5ms Response Time", "Eye-Care Low Blue Light", "Flicker-Free", "HDMI + VGA + DisplayPort", "Speakers Built-in"]'::jsonb,
  '8528', 18, 2, false, 0
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 6, 'opening', 'Initial opening stock');
update public.products set stock_qty = 6 where id = p;


insert into public.products
  (name, description, price, cost_price, category, specs, hsn_code, gst_rate, reorder_level, tracks_serials, stock_qty, barcode)
values (
  'Logitech G502 X Gaming Mouse',
  'Precision gaming mouse with Logitech''s HERO 25K sensor and LIGHTFORCE hybrid optical-mechanical switches. Asymmetric design with customisable weights for competitive players.',
  4495, 3800, 'peripherals',
  '["HERO 25600 DPI Sensor", "13 Programmable Buttons", "LIGHTFORCE Hybrid Switches", "Adjustable Weight System", "USB-A Wired", "100–25600 DPI Range", "Up to 89g weight"]'::jsonb,
  '8471', 18, 4, false, 0, '5099206096614'
) returning id into p;
insert into public.stock_movements (product_id, qty_delta, reason, note) values (p, 10, 'opening', 'Initial opening stock');
update public.products set stock_qty = 10 where id = p;

end $seed$;
