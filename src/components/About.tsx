import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Brain, Rocket, Database, Satellite } from 'lucide-react'
import './About.css'

const highlights = [
  {
    icon: Brain,
    title: 'AI & ML',
    description: 'Building autonomous AI agents, optimizing LLMs with LoRA/PEFT, and designing high-performance inference pipelines.'
  },
  {
    icon: Database,
    title: 'Systems & Scale',
    description: 'Architecting billion-scale vector search systems with sub-250ms latency and 1-4M QPS across GPU clusters.'
  },
  {
    icon: Rocket,
    title: 'Full-Stack',
    description: 'Creating production-ready applications with Next.js, React, and cloud-native AWS architectures.'
  },
  {
    icon: Satellite,
    title: 'Research',
    description: 'Contributing to aerospace software, coastal erosion prediction models, and open-source projects.'
  }
]

export default function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="about" className="about" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">About Me</span>
          <h2 className="section-title">Building at the intersection of AI & software</h2>
          <p className="section-description">
            I'm passionate about pushing the boundaries of what's possible with AI
            while building robust, scalable systems.
          </p>
        </motion.div>

        <div className="about-content">
          <motion.div
            className="about-text"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p>
              I'm a Computer Science student at the <strong>University of Victoria</strong> (April 2027 grad),
              recipient of the International Undergraduate Scholarship. My journey spans from building
              autonomous medical AI systems to contributing to satellite mission control software.
            </p>
            <p>
              Currently, I'm the <strong>Lead AI Developer at Pear Care</strong>, where I architect
              autonomous medical-AI agents using mixture of experts, task-introspective reasoning,
              and adaptive task routing. I've also completed the <strong>MLH Software Engineering
              Fellowship</strong> working on Apache Airflow with Royal Bank of Canada.
            </p>
            <p>
              My research spans multiple labs - optimizing billion-scale vector search at the <strong>DEIA Lab</strong>,
              training multimodal models for coastal erosion prediction at <strong>SOLIDS</strong>,
              and building satellite software at the <strong>UVic Centre for Aerospace Research</strong>.
            </p>

            <div className="about-stats">
              <div className="stat">
                <span className="stat-number">2x</span>
                <span className="stat-label">Hackathon Winner</span>
              </div>
              <div className="stat">
                <span className="stat-number">4+</span>
                <span className="stat-label">Research Positions</span>
              </div>
              <div className="stat">
                <span className="stat-number">Top 10%</span>
                <span className="stat-label">AIMO Competition</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="about-highlights"
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {highlights.map((item, index) => (
              <motion.div
                key={item.title}
                className="highlight-card"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <div className="highlight-icon">
                  <item.icon size={24} />
                </div>
                <div className="highlight-content">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
