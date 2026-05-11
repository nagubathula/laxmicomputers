import postgres from 'postgres';

const sql = postgres('postgresql://postgres:mxqgO2npKlm3HzuH@db.gqtijmimocdibuvcwcju.supabase.co:5432/postgres', { ssl: 'require' });

async function main() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price NUMERIC NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        specs JSONB NOT NULL DEFAULT '[]',
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Clear existing data to avoid duplicates if run multiple times
    await sql`DELETE FROM products;`;

    await sql`
      INSERT INTO products (name, description, price, category, status, specs, image_url)
      VALUES 
      ('RTX 4090 OC Edition', 'The ultimate GeForce GPU. It brings an enormous leap in performance, efficiency, and AI-powered graphics.', 1599, 'Graphics Cards', 'In Stock', '["24GB GDDR6X", "384-bit memory interface", "PCIe 4.0"]'::jsonb, 'https://placehold.co/600x600/1a1a1a/ededed?text=RTX+4090'),
      ('Ryzen 9 7950X3D', 'The ultimate processor for gaming and creation, featuring AMD 3D V-Cache technology for even more game performance.', 699, 'Processors', 'In Stock', '["16 Cores / 32 Threads", "Up to 5.7 GHz Boost", "144MB Cache"]'::jsonb, 'https://placehold.co/600x600/1a1a1a/ededed?text=Ryzen+9'),
      ('Z790 AORUS MASTER', 'E-ATX Motherboard with Direct 20+1+2 Phases Digital VRM Design.', 499, 'Motherboards', 'Low Stock', '["LGA 1700", "DDR5", "PCIe 5.0"]'::jsonb, 'https://placehold.co/600x600/1a1a1a/ededed?text=Z790+Motherboard'),
      ('Dominator Platinum RGB 64GB', 'High-performance DDR5 memory optimized for Intel motherboards.', 299, 'Memory', 'In Stock', '["64GB (2x32GB)", "DDR5-6000", "CL30"]'::jsonb, 'https://placehold.co/600x600/1a1a1a/ededed?text=DDR5+RAM'),
      ('SN850X 2TB NVMe SSD', 'PCIe Gen4 NVMe M.2 Solid State Drive.', 159, 'Storage', 'In Stock', '["2TB Capacity", "PCIe Gen4 x4", "Up to 7300 MB/s Read"]'::jsonb, 'https://placehold.co/600x600/1a1a1a/ededed?text=2TB+NVMe'),
      ('RM1000x 1000W 80+ Gold', 'Fully Modular ATX Power Supply.', 189, 'Power Supplies', 'In Stock', '["1000W", "80 PLUS Gold", "Fully Modular"]'::jsonb, 'https://placehold.co/600x600/1a1a1a/ededed?text=1000W+PSU');
    `;
    console.log("Database schema created and data inserted successfully.");
  } catch (error) {
    console.error("Error executing SQL:", error);
  } finally {
    await sql.end();
  }
}

main();
