import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Send, Mail, MapPin } from 'lucide-react'
import './Contact.css'

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'tanujd@uvic.ca',
    href: 'mailto:tanujd@uvic.ca'
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Victoria, BC, Canada',
    href: null
  }
]

export default function Contact() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setFormState({ name: '', email: '', message: '' })
    alert('Message sent! (This is a demo)')
  }

  return (
    <section id="contact" className="contact" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header contact-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">Contact</span>
          <h2 className="section-title">Let's Connect</h2>
          <p className="section-description">
            Interested in AI research, startup collaboration, or just want to chat
            about cutting-edge tech? I'd love to hear from you.
          </p>
        </motion.div>

        <div className="contact-content">
          <motion.div
            className="contact-info"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="contact-cards">
              {contactInfo.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="contact-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="contact-card-icon">
                    <item.icon size={24} />
                  </div>
                  <div className="contact-card-content">
                    <span className="contact-card-label">{item.label}</span>
                    {item.href ? (
                      <a href={item.href} className="contact-card-value">
                        {item.value}
                      </a>
                    ) : (
                      <span className="contact-card-value">{item.value}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="contact-cta"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <p>Prefer a quick chat?</p>
              <a
                href="https://calendly.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Schedule a Call
              </a>
            </motion.div>
          </motion.div>

          <motion.form
            className="contact-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                placeholder="Your name"
                value={formState.name}
                onChange={e => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="your@email.com"
                value={formState.email}
                onChange={e => setFormState({ ...formState, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                placeholder="Tell me about your project..."
                rows={5}
                value={formState.message}
                onChange={e => setFormState({ ...formState, message: e.target.value })}
                required
              />
            </div>

            <motion.button
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
              <Send size={18} />
            </motion.button>
          </motion.form>
        </div>
      </div>
    </section>
  )
}
