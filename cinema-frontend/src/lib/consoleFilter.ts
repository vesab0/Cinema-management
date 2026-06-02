const blockedPatterns = [
  /^\[vite\]/,
  /Download the React DevTools for a better development experience/,
]

function shouldSuppress(args: unknown[]) {
  return args.some(
    (arg) => typeof arg === 'string' && blockedPatterns.some((pattern) => pattern.test(arg)),
  )
}

if (import.meta.env.DEV) {
  const { info, log, warn } = console

  console.info = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    info(...args)
  }

  console.log = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    log(...args)
  }

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    warn(...args)
  }
}