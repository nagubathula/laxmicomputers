import { redirect } from 'next/navigation';
export default function GraphicsCardsPage() {
  redirect('/products?category=graphics-cards');
}
