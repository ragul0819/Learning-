import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import { validateEmail } from '../utils/Helper';
import { axiosInstance } from '../utils/axiosInstance';
import '../../src/index.css';
import bgImage from '../../src/assets/bg-image.webp';

const Login = () => {
  const [email, setEmail] = useState("visitor-login@gmail.com");
  const [password, setPassword] = useState("password@visitor-login");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const img = new Image();
        img.src = bgImage;
        img.onload = () => {
          containerRef.current.style.backgroundImage = `url(${img.src})`;
        };
        img.onerror = (error) => {
          console.error('Error loading image:', error);
        };
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter the password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await axiosInstance.post("/login", { email, password });
      if (response.data && response.data.accessToken) {
        localStorage.setItem("token", response.data.accessToken);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error('Login Error:', error);
      setError(error.response?.data?.message || "An unexpected error occurred. Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className='bg-no-repeat bg-center bg-cover h-svh w-screen'>
      <Navbar />
      <div className='flex items-center justify-end xs:mt-32 sm:pr-36'>
        <div className='w-96 sm:border bg-opacity-60 bg-slate-100 px-8 xs:py-10 py-28 xs:rounded-3xl'>
          <form onSubmit={handleLogin}>
            <h1 className='text-2xl font-medium mb-7'>Login</h1>
            <input
              id='01'
              type="text"
              placeholder='Email'
              className='input-box'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className='text-red-500 text-xs pb-1'>{error}</p>}
            <button type='submit' className='btn-primary rounded-3xl'>
              <span className={loading ? 'blinking-text' : ''}>
                {loading ? 'Logging in...' : 'Login'}
              </span>
            </button>
            <p className='text-md font-medium text-center mt-3'>
              <Link to="/signUp" className='font-medium text-primary'>
                Not registered yet?
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;