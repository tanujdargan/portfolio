import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Calendar, MapPin, X, ExternalLink, Github, FileText } from 'lucide-react'
import './Experience.css'

interface ExperienceLink {
  label: string
  url: string
  icon: 'github' | 'external' | 'docs'
}

interface ExperienceItem {
  title: string
  company: string
  location: string
  period: string
  description: string
  fullDescription: string
  tags: string[]
  links: ExperienceLink[]
}

const experiences: ExperienceItem[] = [
  {
    title: 'Lead AI Developer',
    company: 'Pear Care',
    location: 'Remote',
    period: 'Sep 2025 - Present',
    description: 'Architecting autonomous medical-AI agents using mixture of experts, task-introspective reasoning, and adaptive task routing.',
    fullDescription: 'Architecting autonomous medical-AI agents using mixture of experts, task-introspective reasoning, and adaptive task routing. Building RAG-scalable AWS architectures with LoRA/PEFT fine-tuning. Developing multi-agent systems for medical diagnosis assistance and patient care optimization. Implementing real-time inference pipelines with sub-100ms latency requirements.',
    tags: ['LLMs', 'MoE', 'LoRA/PEFT', 'AWS', 'RAG'],
    links: [
      { label: 'Pear Care', url: 'https://pearcare.ai', icon: 'external' }
    ]
  },
  {
    title: 'Software Engineering Fellow',
    company: 'Major League Hacking (MLH)',
    location: 'Remote',
    period: 'Jun 2025 - Aug 2025',
    description: 'Contributed to Apache Airflow with Royal Bank of Canada. Enhanced workflow orchestration capabilities.',
    fullDescription: 'Contributed to Apache Airflow with Royal Bank of Canada. Enhanced workflow orchestration capabilities and collaborated with open-source maintainers on production-grade features. Implemented new DAG scheduling features, improved error handling mechanisms, and contributed to documentation efforts. Worked in an agile environment with weekly sprints and code reviews.',
    tags: ['Apache Airflow', 'Python', 'Open Source', 'RBC'],
    links: [
      { label: 'Apache Airflow', url: 'https://github.com/apache/airflow', icon: 'github' },
      { label: 'MLH Fellowship', url: 'https://fellowship.mlh.io', icon: 'external' }
    ]
  },
  {
    title: 'Research Assistant - Vector Search',
    company: 'DEIA Lab, University of Victoria',
    location: 'Victoria, BC',
    period: 'Jan 2025 - Present',
    description: 'Optimizing billion-scale vector search systems achieving sub-250ms latency and 1-4M QPS across GPU clusters.',
    fullDescription: 'Optimizing billion-scale vector search systems achieving sub-250ms latency and 1-4M QPS across GPU clusters. Researching high-performance inference pipelines for semantic search applications. Implementing novel indexing strategies for approximate nearest neighbor search. Benchmarking various vector database solutions and contributing to academic publications.',
    tags: ['Vector Search', 'GPU Clusters', 'High-Performance Computing'],
    links: [
      { label: 'DEIA Lab', url: 'https://www.uvic.ca/engineering/ece/research/groups/deia/', icon: 'external' }
    ]
  },
  {
    title: 'Research Assistant - Coastal AI',
    company: 'SOLIDS Lab, University of Victoria',
    location: 'Victoria, BC',
    period: 'Sep 2025 - Present',
    description: 'Training multimodal models for coastal erosion prediction. Developing computer vision pipelines.',
    fullDescription: 'Training multimodal models for coastal erosion prediction. Developing computer vision pipelines for environmental monitoring and analysis. Working with satellite imagery, drone footage, and ground-truth sensor data to build predictive models. Collaborating with environmental scientists to translate ML insights into actionable conservation strategies.',
    tags: ['Computer Vision', 'Multimodal ML', 'PyTorch'],
    links: [
      { label: 'SOLIDS Lab', url: 'https://www.uvic.ca/engineering/civil/research/solids/', icon: 'external' }
    ]
  },
  {
    title: 'Software Developer',
    company: 'UVic Centre for Aerospace Research (CFAR)',
    location: 'Victoria, BC',
    period: 'Jan 2025 - Present',
    description: 'Building mission control software for MarmotSat 1U CubeSat. Developed C/Java parsing functions for YAMCS.',
    fullDescription: 'Building mission control software for MarmotSat 1U CubeSat. Developed C/Java parsing functions for YAMCS integration and YAML-driven CI pipeline cutting test time from 30min to 4min. Implementing telemetry processing systems, command uplink protocols, and ground station automation. Contributing to Canada\'s growing small satellite program.',
    tags: ['C', 'Java', 'YAMCS', 'CI/CD', 'Satellite Systems'],
    links: [
      { label: 'CFAR', url: 'https://www.uvic.ca/research/centres/aerospace/', icon: 'external' },
      { label: 'YAMCS Docs', url: 'https://yamcs.org/', icon: 'docs' }
    ]
  }
]

const iconMap = {
  github: Github,
  external: ExternalLink,
  docs: FileText
}

export default function Experience() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [selectedExp, setSelectedExp] = useState<ExperienceItem | null>(null)

  return (
    <section id="experience" className="experience" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">Experience</span>
          <h2 className="section-title">Where I've Worked</h2>
          <p className="section-description">
            From AI research labs to open-source contributions and aerospace software.
          </p>
        </motion.div>

        <div className="experience-timeline">
          {experiences.map((exp, index) => (
            <motion.article
              key={`${exp.company}-${exp.title}`}
              className="experience-card"
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              onClick={() => setSelectedExp(exp)}
              whileHover={{ scale: 1.01 }}
              style={{ cursor: 'pointer' }}
            >
              <div className="experience-marker">
                <div className="marker-dot" />
                {index < experiences.length - 1 && <div className="marker-line" />}
              </div>
              <div className="experience-content">
                <div className="experience-header">
                  <div>
                    <h3 className="experience-title">{exp.title}</h3>
                    <p className="experience-company">{exp.company}</p>
                  </div>
                  <div className="experience-meta">
                    <span className="experience-period">
                      <Calendar size={14} />
                      {exp.period}
                    </span>
                    <span className="experience-location">
                      <MapPin size={14} />
                      {exp.location}
                    </span>
                  </div>
                </div>
                <p className="experience-description">{exp.description}</p>
                <div className="experience-tags">
                  {exp.tags.map(tag => (
                    <span key={tag} className="exp-tag">{tag}</span>
                  ))}
                </div>
                <span className="click-hint">Click to expand</span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedExp && (
          <motion.div
            className="experience-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedExp(null)}
          >
            <motion.div
              className="experience-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedExp(null)}
              >
                <X size={24} />
              </button>

              <div className="modal-content">
                <div className="modal-left">
                  <div className="modal-header">
                    <h2 className="modal-title">{selectedExp.title}</h2>
                    <p className="modal-company">{selectedExp.company}</p>
                  </div>

                  <div className="modal-meta">
                    <span className="modal-period">
                      <Calendar size={16} />
                      {selectedExp.period}
                    </span>
                    <span className="modal-location">
                      <MapPin size={16} />
                      {selectedExp.location}
                    </span>
                  </div>

                  <p className="modal-description">{selectedExp.fullDescription}</p>

                  <div className="modal-tags">
                    {selectedExp.tags.map(tag => (
                      <span key={tag} className="modal-tag">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="modal-right">
                  <h3 className="modal-links-title">Relevant Links</h3>
                  <div className="modal-links">
                    {selectedExp.links.map(link => {
                      const IconComponent = iconMap[link.icon]
                      return (
                        <motion.a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modal-link"
                          whileHover={{ x: 4 }}
                        >
                          <IconComponent size={20} />
                          <span>{link.label}</span>
                          <ExternalLink size={14} className="link-arrow" />
                        </motion.a>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
