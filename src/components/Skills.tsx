import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import './Skills.css'

const technologies = [
  // Languages
  'Python', 'Java', 'C', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3',
  // Web & Frameworks
  'React', 'Next.js', 'Node.js', 'Three.js', 'Django',
  // Databases & Backend
  'Firebase', 'MongoDB',
  // ML & Data
  'TensorFlow', 'PyTorch', 'Kaggle',
  // DevOps & Tools
  'Docker', 'Git', 'VS Code',
  // Hardware & IoT
  'Arduino', 'Raspberry Pi',
  // Design & Creative
  'Figma', 'Canva', 'Blender', 'Webflow'
]

export default function Skills() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="skills" className="skills" ref={ref}>
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="section-label">Skills</span>
          <h2 className="section-title">Technical Arsenal</h2>
          <p className="section-description">
            From low-level systems to high-level AI agents - a full-stack toolkit for building at scale.
          </p>
        </motion.div>

        {/* GitHub Stats */}
        <motion.div
          className="github-stats"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="stats-grid">
            <motion.a
              href="https://github.com/tanujdargan"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <img
                src="https://github-readme-stats.vercel.app/api?username=tanujdargan&show_icons=true&theme=midnight-purple&hide_border=true&bg_color=0d1117"
                alt="GitHub Stats"
                loading="lazy"
              />
            </motion.a>
            <motion.a
              href="https://github.com/tanujdargan"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <img
                src="https://github-readme-streak-stats.herokuapp.com/?user=tanujdargan&theme=midnight-purple&hide_border=true&background=0d1117"
                alt="GitHub Streak"
                loading="lazy"
              />
            </motion.a>
            <motion.a
              href="https://github.com/tanujdargan"
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <img
                src="https://github-readme-stats.vercel.app/api/top-langs/?username=tanujdargan&layout=compact&theme=midnight-purple&hide_border=true&bg_color=0d1117"
                alt="Top Languages"
                loading="lazy"
              />
            </motion.a>
          </div>
        </motion.div>

        <motion.div
          className="tech-cloud"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="tech-cloud-title">Technologies & Tools</h3>
          <div className="tech-tags">
            {technologies.map((tech, index) => (
              <motion.span
                key={tech}
                className="tech-tag"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.02 }}
                whileHover={{ scale: 1.1, y: -4 }}
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
