import { motion } from 'framer-motion'
import { Github, Linkedin } from 'lucide-react'
import './Footer.css'

const socialLinks = [
  { icon: Github, href: 'https://github.com/tanujdargan', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/in/tanujdargan', label: 'LinkedIn' },
]

const footerLinks = [
  { name: 'About', href: '#about' },
  { name: 'Experience', href: '#experience' },
  { name: 'Projects', href: '#projects' },
  { name: 'Skills', href: '#skills' },
  { name: 'Contact', href: '#contact' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <a href="#" className="footer-logo">
              Tanuj Dargan
            </a>
            <p className="footer-tagline">
              CS @ UVic. Focused on AI systems and full-stack development.
            </p>
            <div className="footer-socials">
              {socialLinks.map(social => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social"
                  whileHover={{ y: -4, color: '#6366f1' }}
                >
                  <social.icon size={20} />
                </motion.a>
              ))}
            </div>
          </div>

          <div className="footer-nav">
            <h4>Quick Links</h4>
            <ul>
              {footerLinks.map(link => (
                <li key={link.name}>
                  <a href={link.href}>{link.name}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Get in Touch</h4>
            <p>tanujd@uvic.ca</p>
            <p>Victoria, BC, Canada</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            &copy; {currentYear} Tanuj Dargan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
