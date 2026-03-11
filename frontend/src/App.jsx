import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import axios from 'axios'
import { userStore } from './context/userContext'
import toast from 'react-hot-toast'
import Reviews from './pages/organizer/Reviews'
import Marketing from './pages/organizer/Marketing'

const Landing = lazy(() => import('./pages/Landing'));
const Navbar = lazy(() => import('./components/Navbar'));
const Footer = lazy(() => import('./components/Footer'));
const Signup = lazy(() => import('./pages/Signup'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Events = lazy(() => import('./pages/attendee/Events'));
const EventDetails = lazy(() => import('./pages/attendee/EventDetails'));
const Seats = lazy(() => import('./pages/attendee/Seats'));
const MyBookings = lazy(() => import('./pages/attendee/Bookings'));
const Checkout = lazy(() => import('./pages/attendee/Checkout'));
const Dashboard = lazy(() => import('./pages/organizer/Dashboard'));
const DashboardHome = lazy(() => import('./pages/organizer/DashboardHome'));
const AddEvent = lazy(() => import('./pages/organizer/AddEvent'));
const ListShows = lazy(() => import('./pages/organizer/ListShows'));
const ListBookings = lazy(() => import('./pages/organizer/ListBookings'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const ShowDetails = lazy(() => import('./pages/organizer/ShowDetails'));
const EditEvent = lazy(() => import('./pages/organizer/EditEvent'));
const ChatBot = lazy(() => import('./pages/ChatBot'));

axios.defaults.withCredentials = true;

const ProtectedOrganizerRoute = ({ children }) => {
  const isAuth = userStore((state) => state.isAuth);
  const user = userStore((state) => state.user);
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'Organizer') {
    toast.error("This page requires an organizer account.");
    return <Navigate to="/" replace />;
  }
  return children;
};

const ProtectedAttendeeRoute = ({ children }) => {
  const isAuth = userStore((state) => state.isAuth);
  const user = userStore((state) => state.user);
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'Attendee') {
    toast.error("Bookings and ticket purchases require an attendee account.");
    return <Navigate to="/" replace />;
  }
  return children;
};


const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-transparent">
    <div className="loader"></div>
  </div>
);

const LoaderBackend = () => (
  <div className="min-h-screen flex items-center justify-center bg-transparent">
    <div className="loader"></div>
    <p className='text-white text-2xl'>Backend is Starting Just wait for a while.....</p>
  </div>
);

const BackendUnavailable = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-transparent px-6 text-center">
    <p className='text-white text-3xl font-semibold'>Unable to reach the backend.</p>
    <p className='text-white/80 text-lg'>Check that the backend server is running and that VITE_API points to the correct URL.</p>
  </div>
);

const App = () => {
  const [backend, setBackend] = useState(false);
  const [backendFailed, setBackendFailed] = useState(false);
  const backendRef = useRef(false); 

  const start = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/start`, { withCredentials: false });
      console.log(res.data);
      if (res.data.success) {
        setBackend(true);
        setBackendFailed(false);
        backendRef.current = true; 
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    start();
    let attempts = 0;
    const intervalId = setInterval(() => {
      start();
      attempts++;

      if (backendRef.current || attempts >= 10) {
        if (!backendRef.current && attempts >= 10) {
          setBackendFailed(true);
        }
        clearInterval(intervalId);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  if (!backend) {
    if (backendFailed) {
      return <BackendUnavailable />;
    }

    return <LoaderBackend />;
  }
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Navbar/>
        <Routes>
          <Route path="/" element={<Landing/>}/>
          <Route path="/sign-up" element={<Signup/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/profile" element={<Profile/>}/>
          <Route path="/events" element={<Events/>}/>
          <Route path="/my-bookings" element={<ProtectedAttendeeRoute><MyBookings /></ProtectedAttendeeRoute>} />
          <Route path="/events/:id" element={<EventDetails/>} />
          <Route path="/seats/:id" element={<ProtectedAttendeeRoute><Seats/></ProtectedAttendeeRoute>} />
          <Route path="/checkout/:id" element={<ProtectedAttendeeRoute><Checkout/></ProtectedAttendeeRoute>} />
          <Route path="/organizer" element={<ProtectedOrganizerRoute><Dashboard /></ProtectedOrganizerRoute>}>
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="add-event" element={<AddEvent />} />
            <Route path="list-shows" element={<ListShows />} />
            <Route path="list-bookings" element={<ListBookings />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="show/:id" element={<ShowDetails />} />
            <Route path="edit-event/:id" element={<EditEvent />} />
          </Route>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatBot />
        <Footer/>
      </Suspense>
    </BrowserRouter>
  )
}

export default App