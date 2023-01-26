// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from 'axios'

export default async function handler(req, res) {
  const { limit, page, query_term } = req.query

  //create url to search in yts api
  const yts_uri = 'https://yts.mx/api/v2/list_movies.json'
  const url = `${yts_uri}?limit=${limit ?? 30}&page=${page ?? 1}&query_term=${query_term ?? 0}&sort_by=year`

  try {
    const response = await axios.get(url)
    res.status(200).json(response.data)
  } catch (error) {
    res.status(500).send(error)
  }
}
