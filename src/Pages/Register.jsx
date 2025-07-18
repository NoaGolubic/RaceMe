import { useNavigate, A } from "@solidjs/router";
import { createSignal } from 'solid-js';
import { supabase } from "../Services/supabaseClient";
import { useAuth } from "../Auth/SupabaseAuthProvider";

export const [result, setResult] = createSignal({
  email: '',
  username: '',
  carModel: '',
  topSpeed: '',
  password: '',
  confirmPassword: '',
  error: '',
  loading: false,
  success: false,
  userMeta: null
});

function Registracija(props) {
  const navigate = useNavigate();
  const session = useAuth();

  const handleRegistration = async (e) => {
    e.preventDefault();
    setResult({ ...result(), loading: true, error: '', success: false });

    if (result().password !== result().confirmPassword) {
      setResult({ ...result(), error: 'Lozinke se ne poklapaju!', loading: false });
      return;
    }

    try {
         const { data, error: signupError } = await supabase.auth.signUp({
          email: result().email,
          password: result().password,
          options: {
            data: {
              username: result().username,
               carModel: result().carModel,
               carTopSpeed: result().topSpeed
            },
          },
        }); //dohvaca se sa session().user?.user_metadata?.username*/

      if (signupError) {
        setResult({ ...result(), error: `Greška prilikom registracije: ${signupError.message}`, loading: false });
      } else {
        console.log("Korisnik uspješno registriran:", data.user);
        setResult({ ...result(), success: true, loading: false, userMeta: data.user?.user_metadata?.username});
        navigate('/prijava');
      }
    } catch (err) {
      setResult({ ...result(), error: 'Došlo je do pogreške pri registraciji.', loading: false });
    }
  };

  return (
    <section className="bg-emerald-50">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <div className="w-full rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0 bg-red-200 border-red-300">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight md:text-2xl text-black">
              Registracija
            </h1>
            <form className="space-y-4 md:space-y-6" onSubmit={handleRegistration}>
              <div>
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-black">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  className="border-red-100 text-sm rounded-lg block w-full p-2.5 bg-red-50 border-red-300 placeholder-gray-400 text-black focus:ring-red-300 focus:border-red-300"
                  placeholder="name@company.com"
                  value={result().email}
                  onInput={(e) => setResult({ ...result(), email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="username" className="block mb-2 text-sm font-medium text-black">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  className="border-red-100 text-sm rounded-lg block w-full p-2.5 bg-red-50 border-red-300 placeholder-gray-400 text-black focus:ring-red-300 focus:border-red-300"
                  placeholder="MyUsername123"
                  value={result().username}
                  onInput={(e) => setResult({ ...result(), username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="carModel" className="block mb-2 text-sm font-medium text-black">
                  Car model
                </label>
                <input
                  type="text"
                  id="carModel"
                  className="border-red-100 text-sm rounded-lg block w-full p-2.5 bg-red-50 border-red-300 placeholder-gray-400 text-black focus:ring-red-300 focus:border-red-300"
                  placeholder="MyCar"
                  value={result().carModel}
                  onInput={(e) => setResult({ ...result(), carModel: e.target.value })}
                  required
                />
              </div>
               <div>
                <label htmlFor="topSpeed" className="block mb-2 text-sm font-medium text-black">
                  Car`s top speed
                </label>
                <input
                  type="text"
                  id="topSpeed"
                  className="border-red-100 text-sm rounded-lg block w-full p-2.5 bg-red-50 border-red-300 placeholder-gray-400 text-black focus:ring-red-300 focus:border-red-300"
                  placeholder="MyCarTopSpeed"
                  value={result().topSpeed}
                  onInput={(e) => setResult({ ...result(), topSpeed: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-black">
                  Lozinka
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="border-red-100 text-sm rounded-lg block w-full p-2.5 bg-red-50 border-red-300 placeholder-gray-400 text-black focus:ring-red-300 focus:border-red-300"
                  value={result().password}
                  onInput={(e) => setResult({ ...result(), password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block mb-2 text-sm font-medium text-black">
                  Potvrdite lozinku
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  placeholder="••••••••"
                  className="border-red-100 text-sm rounded-lg block w-full p-2.5 bg-red-50 border-red-300 placeholder-gray-400 text-black focus:ring-red-300 focus:border-red-300"
                  value={result().confirmPassword}
                  onInput={(e) => setResult({ ...result(), confirmPassword: e.target.value })}
                  required
                />
              </div>
              {result().error && (
                <div className="text-red-500 text-sm">{result().error}</div>
              )}
              {result().success && (
                <div className="text-green-500 text-sm">Račun uspješno registriran! Preusmjeravam na prijavu...</div>
              )}
              <button
                type="submit"
                className="w-full text-black focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-red-300 hover:bg-red-100 focus:ring-primary-800"
                disabled={result().loading}
              >
                {result().loading ? 'Registracija...' : 'Registracija'}
              </button>
              <p className="text-sm font-light text-gray-900">
                Već imate račun?{' '}
                <A href="/Prijava" className="font-medium hover:underline text-primary-500">
                  Prijavite se ovdje.
                </A>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Registracija;
