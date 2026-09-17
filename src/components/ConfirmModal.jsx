import { useEffect, useEffectEvent } from "react";
import Swal from "sweetalert2";

// onConfirm may return a Promise; reject it to display an error notification.
export function ConfirmModal({
  show,
  title = "İşlemi onaylıyor musunuz?",
  body = "",
  onClose,
  onConfirm,
  confirmText = "Onayla",
  cancelText = "Vazgeç",
  icon = "warning",
  confirmButtonColor = "#0d6efd",
  loadingText = "İşlem yapılıyor...",
  successTitle = "İşlem tamamlandı",
  successText = "",
  errorTitle = "İşlem tamamlanamadı",
  errorText = "Lütfen tekrar deneyin.",
}) {
  const confirm = useEffectEvent(() => onConfirm());
  const close = useEffectEvent((confirmed) => onClose(confirmed));

  useEffect(() => {
    if (!show) return;
    let active = true;
    let ownedPopup;

    function fire(options) {
      const result = Swal.fire(options);
      ownedPopup = Swal.getPopup();
      return result;
    }

    async function run() {
      const result = await fire({
        titleText: title,
        text: body,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor,
        cancelButtonColor: "#6c757d",
        focusCancel: true,
      });
      if (!active) return;
      if (!result.isConfirmed) {
        close(false);
        return;
      }

      fire({
        titleText: loadingText,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      let succeeded = false;
      try {
        await confirm();
        succeeded = true;
        if (!active) return;
        await fire({
          titleText: successTitle,
          text: successText,
          icon: "success",
          confirmButtonText: "Tamam",
          confirmButtonColor: "#0d6efd",
        });
      } catch (error) {
        if (!active) return;
        const message = error?.response?.data?.message;
        await fire({
          titleText: errorTitle,
          text: typeof message === "string" && message.trim() ? message : errorText,
          icon: "error",
          confirmButtonText: "Tamam",
          confirmButtonColor: "#0d6efd",
        });
      }
      if (active) close(succeeded);
    }

    run();
    return () => {
      active = false;
      if (ownedPopup && Swal.getPopup() === ownedPopup) Swal.close();
    };
  }, [show, title, body, confirmText, cancelText, icon, confirmButtonColor,
    loadingText, successTitle, successText, errorTitle, errorText]);

  return null;
}
