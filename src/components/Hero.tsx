import { motion } from 'framer-motion'
import { ArrowDown, Github, Linkedin, Mail, FileText } from 'lucide-react'
import './Hero.css'

const socialLinks = [
  { icon: Github, href: 'https://github.com/tanujdargan', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/in/tanujdargan', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:tanujd@uvic.ca', label: 'Email' },
]

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-container">
        <div className="hero-content">
          <motion.div
            className="hero-label"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="label-dot" />
            Open to opportunities
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Hi, I'm <span className="gradient-text">Tanuj</span>
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            I'm a 3rd Year Computer Science student at the University of Victoria
          </motion.p>

          <motion.p
            className="hero-description"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Building autonomous AI systems, high-performance inference pipelines,
            and winning hackathons along the way.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.a
              href="#projects"
              className="btn btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View My Work
              <ArrowDown size={18} />
            </motion.a>
            <motion.a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Resume
              <FileText size={18} />
            </motion.a>
          </motion.div>

          <motion.div
            className="hero-socials"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {socialLinks.map((social, index) => (
              <motion.a
                key={social.label}
                href={social.href}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -4, color: '#6366f1' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <social.icon size={22} />
              </motion.a>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="hero-image-wrapper">
            <div className="rgb-border-card">
              <div className="hero-image-content">
                <div className="code-block">
                  <div className="code-header">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <pre className="code-content">
{`const tanuj = {
  role: "AI Developer & Researcher",
  education: "UVic CS '27",
  focus: [
    "Autonomous AI Agents",
    "High-Performance ML",
    "Full-Stack Development"
  ],
  currentlyBuilding: "Medical AI @ Pear Care"
};`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ArrowDown size={20} />
        </motion.div>
        <span>Scroll to explore</span>
      </motion.div>
    </section>
  )
}
