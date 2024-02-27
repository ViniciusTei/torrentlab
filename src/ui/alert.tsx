import React from 'react'

interface Props {
  title: string
  message: string
}

function Alert({ title, message }: Props) {
  return (
    <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 rounded-sm" role="alert">
      <p className="font-bold">{title}</p>
      <p>{message}</p>
    </div>
  )
}

export default Alert
