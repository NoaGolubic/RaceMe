import { HashRouter, Route } from "@solidjs/router";

//import MainLayout from "./layouts/MainLayout.jsx";
//import RegLogLayout from "./layouts/RegLogLayout.jsx";

import { AuthProvider } from "./Auth/SupabaseAuthProvider";

import Registracija from "./Pages/Register.jsx";
import Prijava from "./Pages/SignIn.jsx";
import Pocetna from "./Pages/MainComponent.jsx";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
      <Route path="/" component={() => (<Registracija />)} />
      <Route path="/Prijava" component={() => (<Prijava />)} />
      <Route path="/Pocetna" component={() => (<Pocetna />)} />
      </HashRouter>
    </AuthProvider>
  );
}
