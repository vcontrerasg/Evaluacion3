import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Booking from './pages/Booking.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminServices from './pages/admin/AdminServices.jsx';
import AdminReservations from './pages/admin/AdminReservations.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminSocial from './pages/admin/AdminSocial.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="ingresar" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="cuenta" element={<Profile />} />
          <Route path="reservar" element={<Booking />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="servicios" element={<AdminServices />} />
            <Route path="reservas" element={<AdminReservations />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="redes" element={<AdminSocial />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
