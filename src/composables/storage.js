export const uiStore = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export const sessionStore = {
  get(key, fallback = null) {
    try {
      const value = sessionStorage.getItem(key)
      return value ? JSON.parse(value) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value))
  },
  remove(key) {
    sessionStorage.removeItem(key)
  }
}
