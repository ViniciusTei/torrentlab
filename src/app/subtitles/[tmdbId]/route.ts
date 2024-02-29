import { AxiosError } from "axios"
import { NextResponse } from "next/server"
import getAPI from "src/services/api"

export async function GET(request: Request, context: { params: { tmdbId: number } }) {
  const api = getAPI()
  const id = context.params.tmdbId
  try {
    const response = await api.downloadSubtitles(Number(id))
    return NextResponse.json(response.data, { status: 200 })
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        {
          error: error.response.data.message ?? 'Internal Server Error'
        },
        {
          status: error.response.data.status ?? 500
        }
      )
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
