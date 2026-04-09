import { AppProviders } from "@/client/app/AppProviders";
import { AppRouter } from "@/client/app/AppRouter";

const App = () => (
  <AppProviders>
    <AppRouter />
  </AppProviders>
);

export default App;
