import { Provider } from "react-redux";
import { store } from "./app/store";
import { AppRouter } from "./AppRouter";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Provider>
  );
}

export default App;
