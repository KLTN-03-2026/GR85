import { useEffect } from "react";
import AOS from "aos";
import { AppProviders } from "@/client/app/AppProviders";
import { AppRouter } from "@/client/app/AppRouter";

const App = () => {
  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: "ease-out-cubic",
      offset: 60,
      once: false,
      mirror: true,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, []);

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};

export default App;
