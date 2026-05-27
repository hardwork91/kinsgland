import { asset } from '../asset'

/** Icono de moneda (reemplaza al antiguo 💎). */
export function Coin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <img
      src={asset('units/coin.png')}
      alt="moneda"
      className={`inline-block object-contain ${className}`}
      draggable={false}
    />
  )
}
