import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router'; 
import supabase from "../Services/supabaseClient";


function Prijava(props) {
    const [email, setEmail] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);
    const [rememberMe, setRememberMe] = createSignal(false);
    
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email(),
                password: password()
            });

            if (error) {
                setError('Neispravni podaci za prijavu.');
                console.log(error.message);
            } else{
                navigate("/Pocetna");
            }
        } catch (err) {
            setError('Došlo je do pogreške pri prijavi.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <section class="bg-gray-900">
                <div class="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
                    <div class="w-full bg-gray-800 rounded-lg shadow border md:mt-0 sm:max-w-md xl:p-0  border-gray-700">
                        <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
                            <h1 class="text-xl font-bold leading-tight tracking-tight md:text-2xl text-white">
                                Prijava
                            </h1>
                            <form class="space-y-4 md:space-y-6" onSubmit={handleLogin}>
                                <div>
                                    <label for="email" class="block mb-2 text-sm font-medium text-white">E-mail</label>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        class="rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="name@company.com"
                                        value={email()}
                                        onInput={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label for="password" class="block mb-2 text-sm font-medium  text-white">Lozinka</label>
                                    <input
                                        type="password"
                                        name="password"
                                        id="password"
                                        placeholder="••••••••"
                                        class="border  rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
                                        value={password()}
                                        onInput={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-start">
                                        <div class="flex items-center h-5">
                                            <input
                                                id="remember"
                                                aria-describedby="remember"
                                                type="checkbox"
                                                class="w-4 h-4 border rounded  focus:ring-3  bg-gray-700 border-gray-600 focus:ring-primary-600 ring-offset-gray-800"
                                                checked={rememberMe()}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                        </div>
                                        <div class="ml-3 text-sm">
                                            <label for="remember" class="  text-gray-300">Zapamti podatke</label>
                                        </div>
                                    </div>
                                    <a href="#" class="text-sm font-medium  hover:underline text-primary-500">Zaboravljena lozinka?</a>
                                </div>
                                {error() && (
                                    <div class="text-red-500 text-sm">{error()}</div>
                                )}
                                <button
                                    type="submit"
                                    class="w-full text-white focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-primary-600 hover:bg-primary-700 focus:ring-primary-800"
                                    disabled={loading()}
                                >
                                    {loading() ? 'Prijava...' : 'Prijava'}
                                </button>
                                <p class="text-sm font-light text-gray-400">
                                    Nemate račun? <a href="/" class="font-medium  hover:underline text-primary-500">Registracija</a>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Prijava;
