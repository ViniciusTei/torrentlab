type Env = {
  SUBTITLES_KEY: string
  SUBTITLES_EMAIL: string
  SUBTITLES_PASS: string
}


function getEnv() {
  const env = {
    SUBTITLES_EMAIL: process.env.SUBTITLES_EMAIL,
    SUBTITLES_KEY: process.env.SUBTITLES_KEY,
    SUBTITLES_PASS: process.env.SUBTITLES_PASS,
  }

  Object.entries(env).forEach(([key, val]) => {
    if (!val) {
      throw new Error(`Missing ${key} in config `)
    }
  })

  return env as Env
}

export default getEnv()
