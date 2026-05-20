import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  id: string;
  brand: string;
  name: string;
  specs: string;
  price: string;
  image: string;
  inStock: boolean;
  tags?: string[];
}

export function ProductCard({ id, brand, name, specs, price, image, inStock, tags = [] }: ProductCardProps) {
  return (
    <div className="bg-card border border-border rounded-sm tech-shadow flex flex-col h-full overflow-hidden group">
      <div className="relative aspect-square w-full bg-white p-6 border-b border-border flex items-center justify-center">
        {inStock ? (
          <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 uppercase rounded-sm z-10">
            In Stock
          </span>
        ) : (
          <span className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 uppercase rounded-sm z-10">
            Limited
          </span>
        )}
        <div className="relative w-full h-full transition-transform duration-300 group-hover:scale-105">
          <Image 
            src={image} 
            alt={name} 
            fill 
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-medium text-lg leading-tight mb-1 text-primary">{brand} {name}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{specs}</p>
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map(tag => (
              <span key={tag} className="font-mono text-[10px] bg-muted text-primary px-2 py-1 rounded-sm border border-border">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <span className="font-display font-semibold text-xl text-secondary">{price}</span>
          <Link 
            href={`/products/${id}`}
            className="bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 rounded-sm transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
