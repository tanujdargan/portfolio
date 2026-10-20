import { createContext, useContext, type AnchorHTMLAttributes } from 'react'

// ponytail: 30-line router. Paths are static and few; swap for react-router if nested data loading ever appears.
interface Nav {
  path: string
  navigate: (to: string) => void
}
export const RouterCtx = createContext<Nav>({ path: '/', navigate: () => {} })
export const useRouter = () => useContext(RouterCtx)

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        if (to.startsWith('http') || to.startsWith('mailto:') || to.endsWith('.pdf')) return
        e.preventDefault()
        navigate(to)
      }}
    />
  )
}
