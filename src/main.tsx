import { createRoot, hydrateRoot } from 'react-dom/client'
import App, { load } from './App'

// Load the route's variant chunk first so hydration renders the same tree the prerender did.
const el = document.getElementById('root')!
load(location.pathname).then((initial) => {
  const app = <App initial={initial} />
  // In dev the root holds only the <!--app--> placeholder comment, so check for elements, not nodes.
  if (el.firstElementChild) hydrateRoot(el, app)
  else createRoot(el).render(app)
})
