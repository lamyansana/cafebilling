import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // trigger animation on mount

    const timer = setTimeout(() => {
      setVisible(false); // start fade-out
      setTimeout(onClose, 300); // wait for animation before removing
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: visible ? "20px" : "-50px", // slide from above
        left: "50%",
        transform: "translateX(-50%)",
        background: "#333",
        color: "#fff",
        padding: "12px 18px",
        borderRadius: "8px",
        boxShadow: "0px 2px 10px rgba(0,0,0,0.3)",
        zIndex: 9999,
        fontSize: "14px",
        opacity: visible ? 1 : 0,
        transition: "all 0.3s ease-in-out",
      }}
    >
      {message}
    </div>
  );
}

export default Toast;
