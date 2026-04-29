import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full py-4 px-4 text-center text-sm text-gray-400 border-t border-gray-200 bg-transparent">
      <Link to="/privacy" className="hover:text-[#5a7a2e] mx-2 transition-colors">Privacy Policy</Link>
      <span className="text-gray-300">·</span>
      <Link to="/terms" className="hover:text-[#5a7a2e] mx-2 transition-colors">Terms of Service</Link>
    </footer>
  )
}
