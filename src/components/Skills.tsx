import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import './Skills.css'

const skillCategories = [
  {
    title: 'Languages',
    skills: ['Python', 'Java', 'C', 'JavaScript', 'TypeScript', 'Rust', 'YAML']
  },
  {
    title: 'Frontend',
    skills: ['React', 'Next.js', 'Three.js', 'Tailwind CSS', 'Webflow']
  },
  {
    title: 'Backend',
    skills: ['Node.js', 'Django', 'FastAPI', 'Express.js']
  },
  {
    title: 'Databases',
    skills: ['MongoDB', 'Firebase', 'PostgreSQL', 'Redis', 'Supabase']
  },
  {
    title: 'AI/ML',
    skills: ['TensorFlow', 'PyTorch', 'scikit-learn', 'Hugging Face', 'Pandas', 'NumPy', 'OpenCV']
  },
  {
    title: 'LLM/Inference',
    skills: ['LangChain', 'LangGraph', 'vLLM', 'Ollama', 'LoRA', 'OpenAI API']
  },
  {
    title: 'MLOps',
    skills: ['Kaggle', 'Jupyter', 'Weights & Biases', 'MLflow', 'CUDA']
  },
  {
    title: 'Cloud',
    skills: ['GCP', 'AWS', 'Vercel', 'Cloudflare']
  },
  {
    title: 'DevOps/Infra',
    skills: ['Docker', 'Kubernetes', 'Proxmox', 'Terraform', 'Ansible', 'GitHub Actions', 'Nix', 'ZFS', 'UniFi']
  },
  {
    title: 'Monitoring',
    skills: ['Grafana', 'Prometheus', 'Nginx', 'Traefik']
  },
  {
    title: 'Design',
    skills: ['Figma', 'Canva', 'Blender']
  },
  {
    title: 'Tools',
    skills: ['Git', 'VS Code', 'Postman', 'Linux']
  }
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
          className="tech-categories"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="tech-cloud-title">Technologies & Tools</h3>
          <div className="categories-grid">
            {skillCategories.map((category, catIndex) => (
              <motion.div
                key={category.title}
                className="skill-category"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + catIndex * 0.05 }}
              >
                <h4 className="category-title">{category.title}</h4>
                <div className="category-tags">
                  {category.skills.map((skill) => (
                    <motion.span
                      key={skill}
                      className="tech-tag"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
