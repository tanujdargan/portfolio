import { motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { ArrowDown, Github, Linkedin, Mail, FileText } from 'lucide-react'
import './Hero.css'

const socialLinks = [
  { icon: Github, href: 'https://github.com/tanujdargan', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/in/tanujdargan', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:tanujd@uvic.ca', label: 'Email' },
]

const terminalLines = [
  { text: 'const tanuj = {', delay: 0 },
  { text: '  role: "AI Developer & Researcher",', delay: 400 },
  { text: '  education: "UVic CS \'27",', delay: 800 },
  { text: '  focus: [', delay: 1200 },
  { text: '    "Autonomous AI Agents",', delay: 1500 },
  { text: '    "High-Performance ML",', delay: 1800 },
  { text: '    "Full-Stack Development"', delay: 2100 },
  { text: '  ],', delay: 2400 },
  { text: '  currentlyBuilding: "Medical AI @ Pear Care"', delay: 2700 },
  { text: '};', delay: 3100 },
]

function TypingLine({ text, delay }: { text: string; delay: number }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimer)
  }, [delay])

  useEffect(() => {
    if (!started) return
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.substring(0, i + 1))
        i++
      } else {
        clearInterval(interval)
      }
    }, 30)
    return () => clearInterval(interval)
  }, [started, text])

  if (!started) return null

  return (
    <div className="terminal-line">
      {displayed}
      {displayed.length < text.length && <span className="terminal-cursor">|</span>}
    </div>
  )
}

export default function Hero() {
  const terminalRef = useRef<HTMLDivElement>(null)

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
            {/* Shine Border */}
            <div className="shine-border-wrapper">
              <div className="shine-border" />
              {/* Terminal */}
              <div className="terminal" ref={terminalRef}>
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <span className="terminal-title">tanuj.ts</span>
                  <div className="terminal-dots-spacer" />
                </div>
                <div className="terminal-body">
                  {terminalLines.map((line, i) => (
                    <TypingLine key={i} text={line.text} delay={line.delay} />
                  ))}
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
