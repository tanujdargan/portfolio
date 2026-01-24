import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import './Experience.css'

const experiences = [
  {
    title: 'Lead AI Developer',
    company: 'Pear Care',
    location: 'Remote',
    period: 'Sep 2024 - Present',
    description: 'Architecting autonomous medical-AI agents using mixture of experts, task-introspective reasoning, and adaptive task routing. Building RAG-scalable AWS architectures with LoRA/PEFT fine-tuning.',
    tags: ['LLMs', 'MoE', 'LoRA/PEFT', 'AWS', 'RAG']
  },
  {
    title: 'Software Engineering Fellow',
    company: 'Major League Hacking (MLH)',
    location: 'Remote',
    period: 'Jun 2024 - Aug 2024',
    description: 'Contributed to Apache Airflow with Royal Bank of Canada. Enhanced workflow orchestration capabilities and collaborated with open-source maintainers on production-grade features.',
    tags: ['Apache Airflow', 'Python', 'Open Source', 'RBC']
  },
  {
    title: 'Research Assistant - Vector Search',
    company: 'DEIA Lab, University of Victoria',
    location: 'Victoria, BC',
    period: 'Jan 2024 - Present',
    description: 'Optimizing billion-scale vector search systems achieving sub-250ms latency and 1-4M QPS across GPU clusters. Researching high-performance inference pipelines.',
    tags: ['Vector Search', 'GPU Clusters', 'High-Performance Computing']
  },
  {
    title: 'Research Assistant - Coastal AI',
    company: 'SOLIDS Lab, University of Victoria',
    location: 'Victoria, BC',
    period: 'Sep 2024 - Present',
    description: 'Training multimodal models for coastal erosion prediction. Developing computer vision pipelines for environmental monitoring and analysis.',
    tags: ['Computer Vision', 'Multimodal ML', 'PyTorch']
  },
  {
    title: 'Software Developer',
    company: 'UVic Centre for Aerospace Research (CFAR)',
    location: 'Victoria, BC',
    period: 'Jan 2024 - Present',
    description: 'Building mission control software for MarmotSat 1U CubeSat. Developed C/Java parsing functions for YAMCS integration and YAML-driven CI pipeline cutting test time from 30min to 4min.',
    tags: ['C', 'Java', 'YAMCS', 'CI/CD', 'Satellite Systems']
  }
]

export default function Experience() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

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
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
