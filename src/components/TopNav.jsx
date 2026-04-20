import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Phone, Mail, Facebook, Instagram, MessageCircle } from 'lucide-react'

export default function TopNav() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()  // used for My Bookings / Admin nav

  function handleSignOut() {
    signOut()
  }

  return (
    <header style={{ background: 'var(--dark)' }} className="sticky top-0 z-50">
      <div className="max-w-full px-4 py-2 flex items-center justify-between">
        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Pet Lodge" className="h-10 w-auto rounded" />
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm leading-none">Pet Lodge</p>
            <p className="text-xs leading-none" style={{ color: 'var(--border)' }}>Kennels & Cattery</p>
          </div>
        </div>

        {/* Contact info */}
        <div className="hidden lg:flex items-center gap-4 text-xs" style={{ color: 'var(--border)' }}>
          <a href="tel:+96279 8906476" className="flex items-center gap-1 hover:text-white transition-colors">
            <Phone size={12} /> +962 79 8906476
          </a>
          <a href="mailto:info@petlodgejo.com" className="flex items-center gap-1 hover:text-white transition-colors">
            <Mail size={12} /> info@petlodgejo.com
          </a>
          <a href="https://facebook.com/Pet.Lodge.Jo" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            <Facebook size={14} />
          </a>
          <a href="https://instagram.com/pet.lodge.jo" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            <Instagram size={14} />
          </a>
          <a href="https://wa.me/96279 8906476" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            <MessageCircle size={14} />
          </a>
        </div>

        {/* Right nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/booking')} className="btn-dark text-sm py-1.5 px-3">Book Now</button>
          <span className="text-sm hidden sm:block" style={{ color: 'var(--border)' }}>
            {profile?.full_name?.split(' ')[0] || 'User'}
          </span>
          <button onClick={() => navigate('/dashboard')}
            className="text-sm hidden md:block hover:text-white transition-colors" style={{ color: 'var(--border)' }}>
            My Bookings
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/admin/dashboard')}
              className="text-sm hidden md:block hover:text-white transition-colors" style={{ color: 'var(--border)' }}>
              Admin
            </button>
          )}
          <button onClick={handleSignOut}
            className="text-sm hover:text-white transition-colors" style={{ color: 'var(--border)' }}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
