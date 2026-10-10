"use client";
import { useEffect, useState } from "react";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";
import { TOAST_EVENT } from "@/lib/toast";

let nextId = 0;

/** Menampilkan toast yang dipicu lewat showToast() dan peringatan penyimpanan. */
export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const add = (detail) => setToasts((list) => [...list, { id: (nextId += 1), ...detail }]);
    const onToast = (event) => add(event.detail);
    const onStorageError = () =>
      add({
        message: "Penyimpanan browser tidak tersedia. Progres hanya tersimpan selama halaman terbuka.",
        type: "warning",
        delay: 8000,
      });
    window.addEventListener(TOAST_EVENT, onToast);
    window.addEventListener("mb:storage-error", onStorageError);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.removeEventListener("mb:storage-error", onStorageError);
    };
  }, []);

  const remove = (id) => setToasts((list) => list.filter((t) => t.id !== id));

  return (
    <ToastContainer position="bottom-end" className="p-3 position-fixed">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          autohide
          delay={t.delay}
          onClose={() => remove(t.id)}
          className={`mb-toast mb-toast-${t.type}`}
          role={t.type === "danger" || t.type === "warning" ? "alert" : "status"}
        >
          <div className="d-flex">
            <Toast.Body>{t.message}</Toast.Body>
            <button type="button" className="btn-close me-2 m-auto" aria-label="Tutup" onClick={() => remove(t.id)} />
          </div>
        </Toast>
      ))}
    </ToastContainer>
  );
}
