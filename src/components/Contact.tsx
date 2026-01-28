import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Mail, MapPin } from 'lucide-react'
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
          </motion.div>

          <motion.div
            className="contact-cta"
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p>Prefer a quick chat?</p>
            <a
              href="https://calendly.com/dargantanuj/peer-check-in"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Schedule a Call
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
