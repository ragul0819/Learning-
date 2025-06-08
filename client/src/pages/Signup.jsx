import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import PasswordInput from '../components/PasswordInput';
import { Link, useNavigate } from 'react-router-dom';
import { validateEmail } from '../utils/Helper';
import { axiosInstance } from '../utils/axiosInstance'; // Assuming this is your configured Axios instance

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Define loading state
  const [loadingMessage, setLoadingMessage] = useState(""); // Define loading message for button text
  const containerRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const img = new Image();
        img.src = '/bg-image.webp'; // Path relative to the public folder
        img.onload = () => {
          if (containerRef.current) {
            containerRef.current.style.backgroundImage = `url(${img.src})`;
          }
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

  const handleSignUp = async (e) => {
    e.preventDefault();

    // --- Input Validation ---
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!password) {
      setError("Please enter the password");
      return;
    }

    setError(""); // Clear previous errors
    setLoading(true); // Set loading to true when the API call starts
    setLoadingMessage("Creating Account..."); // Set loading message for button

    // --- API Call for Account Creation ---
    try {
      const response = await axiosInstance.post("/create-account", {
        fullName: name,
        email: email,
        password: password
      });

      // Assuming your backend sends an 'accessToken' upon successful creation if no OTP is needed
      if (response.data && response.data.accessToken) {
        localStorage.setItem("token", response.data.accessToken);
        navigate("/dashboard"); // Navigate to dashboard upon successful creation and login
      } else if (response.data && response.data.error) {
        // Handle specific backend errors (e.g., user already exists)
        setError(response.data.message);
      } else {
        // Generic success message if no token is returned but the request was successful
        // (e.g., if you expect them to log in manually after this)
        setError("Account created successfully! Please log in.");
        // You might navigate to login page here: navigate("/login");
      }

    } catch (error) {
      // Handle network errors or server-side validation errors
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false); // Always stop loading, regardless of success or error
      setLoadingMessage(""); // Clear loading message
    }
  };

  return (
    <div ref={containerRef} className='bg-no-repeat bg-center bg-cover h-svh w-screen'>
      <Navbar />
      <div className='flex items-center justify-end xs:mt-32 sm:pr-36'>
        <div className='w-96 sm:border bg-opacity-60 bg-slate-100 px-8 xs:py-10 py-36 xs:rounded-3xl'>
          <form onSubmit={handleSignUp}>
            <h4 className='text-2xl font-medium mb-7'>Sign Up</h4>

            <input
              type="text"
              placeholder='Username'
              className='input-box'
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading} // Disable input during loading
            />
            <input
              type="text"
              placeholder='Email'
              className='input-box'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading} // Disable input during loading
            />

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading} // Disable input during loading
            />

            {error && <p className='text-red-500 text-xs pb-1'>{error}</p>}

            <button type='submit' className='btn-primary rounded-3xl' disabled={loading}>
              <span className={loading ? 'blinking-text' : ''}>
                {loading ? loadingMessage : 'Create an Account'}
              </span>
            </button>

            <p className='text-md text-center mt-4'>
              <Link to="/login" className='font-medium text-primary'>
                Already have an account?
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignUp;