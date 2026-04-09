import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "Loi 404: Nguoi dung truy cap duong dan khong ton tai:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! Khong tim thay trang
        </p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Quay ve trang chu
        </a>
      </div>
    </div>
  );
};

export default NotFound;
