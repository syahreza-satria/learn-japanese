"use client";
import { useEffect, useState } from "react";
import { getFavorites, toggleFavorite } from "@/lib/storage";

/** Tombol bintang untuk menandai item sebagai favorit. */
export default function FavoriteButton({ id, label, className = "btn btn-sm btn-outline-secondary", onChange }) {
  const [fav, setFav] = useState(false);
  useEffect(() => setFav(getFavorites().includes(id)), [id]);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={fav}
      aria-label={fav ? `Hapus ${label} dari favorit` : `Tandai ${label} sebagai favorit`}
      title={fav ? "Hapus dari favorit" : "Tandai favorit"}
      onClick={(e) => {
        e.stopPropagation();
        const now = toggleFavorite(id);
        setFav(now);
        onChange?.(now);
      }}
    >
      <i className={`bi ${fav ? "bi-star-fill text-warning" : "bi-star"}`} aria-hidden="true" />
    </button>
  );
}
